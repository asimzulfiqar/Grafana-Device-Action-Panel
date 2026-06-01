package plugin

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func TestBuildTargetURLUsesEscapedDeviceID(t *testing.T) {
	target, err := buildTargetURL("https://iot.example.test/api/", "devices/{{deviceId}}/reboot", ActionRequest{DeviceID: "site:device"})
	if err != nil {
		t.Fatal(err)
	}
	if target != "https://iot.example.test/api/devices/site:device/reboot" {
		t.Fatalf("unexpected target URL: %s", target)
	}
}

func TestBuildTargetURLRejectsAbsoluteActionPath(t *testing.T) {
	_, err := buildTargetURL("https://iot.example.test", "https://evil.example.test/{{deviceId}}", ActionRequest{DeviceID: "device-1"})
	if err == nil {
		t.Fatal("expected absolute URL to be rejected")
	}
}

func TestBuildTargetURLExplainsMissingBackendURL(t *testing.T) {
	_, err := buildTargetURL("", "/devices/{{deviceId}}/reboot", ActionRequest{DeviceID: "device-1"})
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected missing backend URL error, got %v", err)
	}
}

func TestRenderTemplateRejectsUnsupportedPlaceholder(t *testing.T) {
	_, err := renderTemplate(`{"device":"{{unknown}}"}`, ActionRequest{DeviceID: "device-1"}, false)
	if err == nil || !strings.Contains(err.Error(), "unsupported placeholder") {
		t.Fatalf("expected placeholder validation error, got %v", err)
	}
}

func TestRoleAllowed(t *testing.T) {
	if !roleAllowed("Editor", []string{"Admin", "Editor"}) {
		t.Fatal("expected editor to be allowed")
	}
	if roleAllowed("Viewer", []string{"Admin", "Editor"}) {
		t.Fatal("expected viewer to be denied")
	}
}

func TestRequestIdentityUsesGrafanaPluginContext(t *testing.T) {
	contextWithPlugin := backend.WithPluginContext(context.Background(), backend.PluginContext{OrgID: 42})
	contextWithUser := backend.WithUser(contextWithPlugin, &backend.User{Login: "operator", Role: "Editor"})
	req := httptest.NewRequest(http.MethodGet, "/identity", nil).WithContext(contextWithUser)

	identity := requestIdentity(req)
	if identity.User != "operator" || identity.Role != "Editor" || identity.OrgID != 42 {
		t.Fatalf("unexpected identity: %+v", identity)
	}
}

func TestParameterKeysAreSortedWithoutValues(t *testing.T) {
	keys := parameterKeys(map[string]string{"mode": "secret-value", "reason": "maintenance"})
	if strings.Join(keys, ",") != "mode,reason" {
		t.Fatalf("unexpected parameter keys: %v", keys)
	}
}

func TestExecuteActionRejectsMissingAndMalformedDeviceIDs(t *testing.T) {
	app := testApp("http://iot.example.test", ActionDefinition{Key: "cancel", Label: "Cancel", Path: "/devices/{{deviceId}}", Method: http.MethodPost})

	response, code := app.executeAction(context.Background(), ActionRequest{ActionKey: "cancel"}, Identity{})
	if code != http.StatusBadRequest || response.Message != "device ID is required" {
		t.Fatalf("unexpected missing ID response: code=%d response=%+v", code, response)
	}

	response, code = app.executeAction(context.Background(), ActionRequest{ActionKey: "cancel", DeviceID: "bad id"}, Identity{})
	if code != http.StatusBadRequest || response.Message != "device ID is invalid" {
		t.Fatalf("unexpected malformed ID response: code=%d response=%+v", code, response)
	}
}

func TestExecuteActionMapsUnavailableBackend(t *testing.T) {
	app := testApp("http://127.0.0.1:1", ActionDefinition{Key: "cancel", Label: "Cancel", Path: "/devices/{{deviceId}}", Method: http.MethodPost})

	response, code := app.executeAction(context.Background(), ActionRequest{ActionKey: "cancel", DeviceID: "device-1"}, Identity{})
	if code != http.StatusBadGateway || !response.Retryable || response.Message != "device backend is unavailable" {
		t.Fatalf("unexpected unavailable response: code=%d response=%+v", code, response)
	}
}

func TestExecuteActionMapsTimeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(1500 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	app := testApp(server.URL, ActionDefinition{Key: "slow", Label: "Slow", Path: "/devices/{{deviceId}}", Method: http.MethodPost, TimeoutSeconds: 1})

	response, code := app.executeAction(context.Background(), ActionRequest{ActionKey: "slow", DeviceID: "device-1"}, Identity{})
	if code != http.StatusGatewayTimeout || response.Status != "timed_out" {
		t.Fatalf("unexpected timeout response: code=%d response=%+v", code, response)
	}
}

func TestExecuteActionMapsDeniedAndRejectedBackendResponses(t *testing.T) {
	for _, testCase := range []struct {
		name           string
		backendCode    int
		expectedCode   int
		expectedStatus string
	}{
		{name: "denied", backendCode: http.StatusForbidden, expectedCode: http.StatusForbidden, expectedStatus: "denied"},
		{name: "failed", backendCode: http.StatusInternalServerError, expectedCode: http.StatusBadGateway, expectedStatus: "failed"},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(testCase.backendCode)
			}))
			defer server.Close()
			app := testApp(server.URL, ActionDefinition{Key: "cancel", Label: "Cancel", Path: "/devices/{{deviceId}}", Method: http.MethodPost})

			response, code := app.executeAction(context.Background(), ActionRequest{ActionKey: "cancel", DeviceID: "device-1"}, Identity{})
			if code != testCase.expectedCode || response.Status != testCase.expectedStatus || response.BackendCode != testCase.backendCode {
				t.Fatalf("unexpected response: code=%d response=%+v", code, response)
			}
		})
	}
}

func TestExecuteActionEnforcesRolePolicy(t *testing.T) {
	app := testApp("http://iot.example.test", ActionDefinition{
		Key: "reboot", Label: "Reboot", Path: "/devices/{{deviceId}}", Method: http.MethodPost, AllowedRoles: []string{"Admin"},
	})

	response, code := app.executeAction(context.Background(), ActionRequest{ActionKey: "reboot", DeviceID: "device-1"}, Identity{Role: "Viewer"})
	if code != http.StatusForbidden || response.Status != "denied" {
		t.Fatalf("unexpected policy response: code=%d response=%+v", code, response)
	}
}

func TestExecuteActionEnforcesAndExpiresCooldown(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requests.Add(1)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	app := testApp(server.URL, ActionDefinition{
		Key: "cancel", Label: "Cancel", Path: "/devices/{{deviceId}}", Method: http.MethodPost, CooldownSeconds: 1,
	})
	request := ActionRequest{ActionKey: "cancel", DeviceID: "device-1"}

	if response, code := app.executeAction(context.Background(), request, Identity{}); code != http.StatusOK || !response.Accepted {
		t.Fatalf("unexpected first response: code=%d response=%+v", code, response)
	}
	if response, code := app.executeAction(context.Background(), request, Identity{}); code != http.StatusTooManyRequests || response.Status != "denied" {
		t.Fatalf("unexpected cooldown response: code=%d response=%+v", code, response)
	}
	time.Sleep(1100 * time.Millisecond)
	if response, code := app.executeAction(context.Background(), request, Identity{}); code != http.StatusOK || !response.Accepted {
		t.Fatalf("unexpected post-cooldown response: code=%d response=%+v", code, response)
	}
	if requests.Load() != 2 {
		t.Fatalf("expected two backend requests, got %d", requests.Load())
	}
}

func TestExecuteActionExtractsCommandID(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"commandId":"cmd-123"}`))
	}))
	defer server.Close()
	app := testApp(server.URL, ActionDefinition{Key: "reboot", Label: "Reboot", Path: "/devices/{{deviceId}}", Method: http.MethodPost})

	response, code := app.executeAction(context.Background(), ActionRequest{ActionKey: "reboot", DeviceID: "device-1"}, Identity{})
	if code != http.StatusOK || response.CommandID != "cmd-123" {
		t.Fatalf("unexpected command response: code=%d response=%+v", code, response)
	}
}

func testApp(baseURL string, action ActionDefinition) *App {
	return &App{
		settings: Settings{
			BaseURL:               baseURL,
			DeviceIDPattern:       `^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$`,
			DefaultTimeoutSeconds: 10,
			Actions:               []ActionDefinition{action},
		},
		cooldowns: make(map[string]timeStamp),
	}
}
