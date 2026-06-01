package plugin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

func (a *App) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/actions/execute", a.handleExecuteAction)
}

func (a *App) handleExecuteAction(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "failed", "method not allowed")
		return
	}
	var actionReq ActionRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, req.Body, 64*1024)).Decode(&actionReq); err != nil {
		writeError(w, http.StatusBadRequest, "failed", "invalid request body")
		return
	}
	response, statusCode := a.executeAction(req.Context(), actionReq, requestIdentity(req))
	writeJSON(w, statusCode, response)
}

func (a *App) executeAction(ctx context.Context, req ActionRequest, identity Identity) (response ActionResponse, statusCode int) {
	response.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	response.Status = "failed"
	statusCode = http.StatusBadRequest
	defer func() { a.audit(req, identity, response, statusCode) }()

	action, ok := a.findAction(req.ActionKey)
	if !ok {
		response.Message = "action is not configured"
		return
	}
	if req.DeviceID == "" {
		response.Message = "device ID is required"
		return
	}
	pattern, err := regexp.Compile(a.settings.DeviceIDPattern)
	if err != nil {
		response.Message = "device ID validation is misconfigured"
		statusCode = http.StatusInternalServerError
		return
	}
	if !pattern.MatchString(req.DeviceID) {
		response.Message = "device ID is invalid"
		return
	}
	if !roleAllowed(identity.Role, action.AllowedRoles) {
		response.Status = "denied"
		response.Message = "action is not allowed for the current Grafana role"
		statusCode = http.StatusForbidden
		return
	}
	target, err := buildTargetURL(a.settings.BaseURL, action.Path, req)
	if err != nil {
		response.Message = err.Error()
		return
	}
	if !a.reserveCooldown(action, req.DeviceID) {
		response.Status = "denied"
		response.Message = "action is cooling down; wait before trying again"
		statusCode = http.StatusTooManyRequests
		return
	}
	body, err := renderTemplate(action.BodyTemplate, req, false)
	if err != nil {
		response.Message = err.Error()
		return
	}
	method := strings.ToUpper(action.Method)
	if method == "" {
		method = http.MethodPost
	}
	timeout := action.TimeoutSeconds
	if timeout <= 0 {
		timeout = a.settings.DefaultTimeoutSeconds
	}
	timeoutCtx, cancel := context.WithTimeout(ctx, time.Duration(timeout)*time.Second)
	defer cancel()
	outbound, err := http.NewRequestWithContext(timeoutCtx, method, target, strings.NewReader(body))
	if err != nil {
		response.Message = "unable to build backend request"
		return
	}
	if body != "" {
		outbound.Header.Set("Content-Type", "application/json")
	}
	if a.apiToken != "" {
		outbound.Header.Set("Authorization", "Bearer "+a.apiToken)
	}

	result, err := http.DefaultClient.Do(outbound)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(timeoutCtx.Err(), context.DeadlineExceeded) {
			response.Status = "timed_out"
			response.Message = "device backend timed out"
			statusCode = http.StatusGatewayTimeout
			return
		}
		response.Message = "device backend is unavailable"
		response.Retryable = true
		statusCode = http.StatusBadGateway
		return
	}
	defer result.Body.Close()
	response.BackendCode = result.StatusCode
	payload, _ := io.ReadAll(io.LimitReader(result.Body, 64*1024))
	response.CommandID = extractCommandID(payload)
	if result.StatusCode < 200 || result.StatusCode >= 300 {
		if result.StatusCode == http.StatusForbidden {
			response.Status = "denied"
			response.Message = "device backend denied the command"
			statusCode = http.StatusForbidden
			return
		}
		response.Message = fmt.Sprintf("device backend rejected the command with status %d", result.StatusCode)
		statusCode = http.StatusBadGateway
		return
	}
	response.Accepted = true
	response.Status = "succeeded"
	response.Message = fmt.Sprintf("%s accepted for device %s", action.Label, req.DeviceID)
	statusCode = http.StatusOK
	return
}

func (a *App) findAction(key string) (ActionDefinition, bool) {
	for _, action := range a.settings.Actions {
		if action.Key == key {
			return action, true
		}
	}
	return ActionDefinition{}, false
}

func (a *App) reserveCooldown(action ActionDefinition, deviceID string) bool {
	key := action.Key + ":" + deviceID
	now := time.Now().Unix()
	a.mutex.Lock()
	defer a.mutex.Unlock()
	if current := a.cooldowns[key]; current.until > now {
		return false
	}
	a.cooldowns[key] = timeStamp{until: now + int64(action.CooldownSeconds)}
	return true
}

func buildTargetURL(baseURL, pathTemplate string, req ActionRequest) (string, error) {
	base, err := url.Parse(baseURL)
	if err != nil || base.Scheme == "" || base.Host == "" {
		if strings.TrimSpace(baseURL) == "" {
			return "", errors.New("backend base URL is not configured; save it from the panel editor Connector section")
		}
		return "", errors.New("backend base URL is invalid")
	}
	renderedPath, err := renderTemplate(pathTemplate, req, true)
	if err != nil {
		return "", err
	}
	relative, err := url.Parse(renderedPath)
	if err != nil || relative.IsAbs() || relative.Host != "" {
		return "", errors.New("action path must be relative to the configured backend")
	}
	return base.ResolveReference(relative).String(), nil
}

func renderTemplate(template string, req ActionRequest, forURL bool) (string, error) {
	values := map[string]string{"deviceId": req.DeviceID, "tenantId": req.TenantID, "siteId": req.SiteID}
	for key, value := range req.Parameters {
		values["parameters."+key] = value
	}
	for key, value := range values {
		if forURL {
			value = url.PathEscape(value)
		} else {
			encoded, _ := json.Marshal(value)
			value = string(bytes.Trim(encoded, `"`))
		}
		template = strings.ReplaceAll(template, "{{"+key+"}}", value)
	}
	if strings.Contains(template, "{{") || strings.Contains(template, "}}") {
		return "", errors.New("action template contains an unsupported placeholder")
	}
	return template, nil
}

func extractCommandID(payload []byte) string {
	var body struct {
		CommandID string `json:"commandId"`
		ID        string `json:"id"`
	}
	if json.Unmarshal(payload, &body) != nil {
		return ""
	}
	if body.CommandID != "" {
		return body.CommandID
	}
	return body.ID
}

type Identity struct {
	User string
	Role string
}

func requestIdentity(req *http.Request) Identity {
	return Identity{User: req.Header.Get("X-Grafana-User"), Role: req.Header.Get("X-Grafana-Role")}
}

func roleAllowed(role string, allowed []string) bool {
	if len(allowed) == 0 {
		return true
	}
	for _, candidate := range allowed {
		if strings.EqualFold(role, candidate) {
			return true
		}
	}
	return false
}

func (a *App) audit(req ActionRequest, identity Identity, response ActionResponse, backendCode int) {
	log.DefaultLogger.Info("device action audit",
		"user", identity.User,
		"role", identity.Role,
		"dashboardUid", req.DashboardUID,
		"panelId", req.PanelID,
		"deviceId", req.DeviceID,
		"actionKey", req.ActionKey,
		"outcome", response.Status,
		"backendCode", response.BackendCode,
		"httpStatus", backendCode,
	)
}

func writeError(w http.ResponseWriter, code int, status, message string) {
	writeJSON(w, code, ActionResponse{Status: status, Message: message, CompletedAt: time.Now().UTC().Format(time.RFC3339)})
}

func writeJSON(w http.ResponseWriter, code int, payload ActionResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}
