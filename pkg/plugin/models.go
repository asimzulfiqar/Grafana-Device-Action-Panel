package plugin

import (
	"encoding/json"
	"errors"
)

type Settings struct {
	BaseURL               string             `json:"baseUrl"`
	DeviceIDPattern       string             `json:"deviceIdPattern"`
	DefaultTimeoutSeconds int                `json:"defaultTimeoutSeconds"`
	Actions               []ActionDefinition `json:"actions"`
}

type ActionDefinition struct {
	Key             string   `json:"key"`
	Label           string   `json:"label"`
	Path            string   `json:"path"`
	Method          string   `json:"method"`
	BodyTemplate    string   `json:"bodyTemplate"`
	CooldownSeconds int      `json:"cooldownSeconds"`
	TimeoutSeconds  int      `json:"timeoutSeconds"`
	AllowedRoles    []string `json:"allowedRoles"`
}

type ActionRequest struct {
	ActionKey    string            `json:"actionKey"`
	DeviceID     string            `json:"deviceId"`
	TenantID     string            `json:"tenantId"`
	SiteID       string            `json:"siteId"`
	DashboardUID string            `json:"dashboardUid"`
	PanelID      int64             `json:"panelId"`
	Parameters   map[string]string `json:"parameters"`
	RequestedAt  string            `json:"requestedAt"`
}

type ActionResponse struct {
	Accepted    bool   `json:"accepted"`
	Status      string `json:"status"`
	Message     string `json:"message"`
	BackendCode int    `json:"backendCode,omitempty"`
	CommandID   string `json:"commandId,omitempty"`
	CompletedAt string `json:"completedAt"`
	Retryable   bool   `json:"retryable,omitempty"`
}

func loadSettings(raw json.RawMessage) (Settings, error) {
	settings := Settings{
		DeviceIDPattern:       `^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$`,
		DefaultTimeoutSeconds: 10,
		Actions: []ActionDefinition{
			{Key: "cancel_alert", Label: "Cancel Alert", Path: "/devices/{{deviceId}}/alerts/cancel", Method: "POST", CooldownSeconds: 5},
			{Key: "acknowledge_alarm", Label: "Acknowledge Alarm", Path: "/devices/{{deviceId}}/alarms/acknowledge", Method: "POST", CooldownSeconds: 5},
			{Key: "reboot_device", Label: "Reboot Device", Path: "/devices/{{deviceId}}/reboot", Method: "POST", CooldownSeconds: 30},
		},
	}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &settings); err != nil {
			return Settings{}, err
		}
	}
	if settings.DeviceIDPattern == "" {
		return Settings{}, errors.New("deviceIdPattern must not be empty")
	}
	return settings, nil
}
