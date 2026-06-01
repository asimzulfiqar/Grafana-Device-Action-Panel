package plugin

import (
	"context"
	"net/http"
	"sync"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
)

var (
	_ backend.CallResourceHandler   = (*App)(nil)
	_ instancemgmt.InstanceDisposer = (*App)(nil)
	_ backend.CheckHealthHandler    = (*App)(nil)
)

type App struct {
	backend.CallResourceHandler
	settings  Settings
	apiToken  string
	cooldowns map[string]timeStamp
	mutex     sync.Mutex
}

type timeStamp struct {
	until int64
}

func NewApp(_ context.Context, instanceSettings backend.AppInstanceSettings) (instancemgmt.Instance, error) {
	settings, err := loadSettings(instanceSettings.JSONData)
	if err != nil {
		return nil, err
	}
	app := &App{
		settings:  settings,
		apiToken:  instanceSettings.DecryptedSecureJSONData["apiToken"],
		cooldowns: make(map[string]timeStamp),
	}
	mux := http.NewServeMux()
	app.registerRoutes(mux)
	app.CallResourceHandler = httpadapter.New(mux)
	return app, nil
}

func (a *App) Dispose() {}

func (a *App) CheckHealth(_ context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	if a.settings.BaseURL == "" {
		return &backend.CheckHealthResult{Status: backend.HealthStatusError, Message: "backend base URL is not configured"}, nil
	}
	return &backend.CheckHealthResult{Status: backend.HealthStatusOk, Message: "device action backend is configured"}, nil
}
