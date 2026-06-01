package plugin

import (
	"strings"
	"testing"
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
