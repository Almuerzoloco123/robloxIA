"""
RAASE 2.0 - Roblox Studio Viewport Screen Capture Worker
Locates the active Roblox Studio window, brings it to foreground, retrieves its window rect,
and captures the window dimensions with .NET Graphics.
"""

import os
import sys
import ctypes
from ctypes import wintypes
import subprocess

OUTPUT_FILENAME = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "viewport_latest.png"))

user32 = ctypes.windll.user32

class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long),
        ("top", ctypes.c_long),
        ("right", ctypes.c_long),
        ("bottom", ctypes.c_long)
    ]

def find_roblox_studio_window():
    target_hwnd = None
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)

    def enum_windows_callback(hwnd, lparam):
        nonlocal target_hwnd
        if user32.IsWindowVisible(hwnd):
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buff = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buff, length + 1)
                title = buff.value
                if "Roblox Studio" in title:
                    target_hwnd = hwnd
                    return False
        return True

    user32.EnumWindows(WNDENUMPROC(enum_windows_callback), 0)
    return target_hwnd

def get_window_bounds(hwnd):
    rect = RECT()
    if user32.GetWindowRect(hwnd, ctypes.byref(rect)):
        x = rect.left
        y = rect.top
        w = max(100, rect.right - rect.left)
        h = max(100, rect.bottom - rect.top)
        return (x, y, w, h)
    return None

def capture_rect(x, y, w, h):
    safe_output = OUTPUT_FILENAME.replace("'", "''").replace("\\", "\\\\")
    ps_script = f"""
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $bounds = New-Object System.Drawing.Rectangle {x}, {y}, {w}, {h}
    $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save('{safe_output}', [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Output "SAVED_OK"
    """
    result = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True)
    return "SAVED_OK" in result.stdout

def main():
    hwnd = find_roblox_studio_window()
    if hwnd:
        user32.SetForegroundWindow(hwnd)
        user32.ShowWindow(hwnd, 9) # SW_RESTORE
        bounds = get_window_bounds(hwnd)
        if bounds:
            x, y, w, h = bounds
            print(f"[ScreenCapture] Located Roblox Studio HWND: {hwnd} at bounds ({x}, {y}, {w}x{h})")
            success = capture_rect(x, y, w, h)
        else:
            success = capture_rect(0, 0, 1920, 1080)
    else:
        print("[ScreenCapture] Roblox Studio not in foreground. Capturing primary display.")
        success = capture_rect(0, 0, 1920, 1080)

    if success and os.path.exists(OUTPUT_FILENAME):
        size_kb = os.path.getsize(OUTPUT_FILENAME) / 1024
        print(f"[ScreenCapture] Successfully captured viewport to {OUTPUT_FILENAME} ({size_kb:.1f} KB)")
        sys.exit(0)
    else:
        print("[ScreenCapture] Error: Could not save viewport capture.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
