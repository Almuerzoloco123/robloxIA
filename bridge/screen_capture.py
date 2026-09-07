"""
RAASE 2.0 - Roblox Studio Viewport Screen Capture Worker
Captures the active Roblox Studio 3D Viewport window without third-party dependencies.
Uses Windows Win32 API via ctypes and falls back to .NET System.Drawing via PowerShell if needed.
"""

import os
import sys
import ctypes
from ctypes import wintypes
import subprocess

OUTPUT_FILENAME = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "viewport_latest.png"))

def find_roblox_studio_window():
    user32 = ctypes.windll.user32
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
                    return False # Stop enumerating
        return True

    user32.EnumWindows(WNDENUMPROC(enum_windows_callback), 0)
    return target_hwnd

def capture_with_powershell(hwnd=None):
    """
    Capture using PowerShell and .NET Graphics.
    Highly reliable across all Windows systems without external pip packages.
    """
    ps_script = f"""
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $hwnd = [IntPtr]{hwnd if hwnd else 0}
    if ($hwnd -ne [IntPtr]::Zero) {{
        $rect = New-Object System.Drawing.Rectangle
        # Bring to front or read bounds
        [void][System.Windows.Forms.SendKeys]
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    }} else {{
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    }}

    $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save('{OUTPUT_FILENAME.replace('\\', '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Output "SAVED_OK"
    """
    result = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True)
    return "SAVED_OK" in result.stdout

def main():
    hwnd = find_roblox_studio_window()
    if hwnd:
        print(f"[ScreenCapture] Located Roblox Studio HWND: {hwnd}")
    else:
        print("[ScreenCapture] Roblox Studio window not detected in foreground. Capturing primary display.")

    success = capture_with_powershell(hwnd)
    if success and os.path.exists(OUTPUT_FILENAME):
        size_kb = os.path.getsize(OUTPUT_FILENAME) / 1024
        print(f"[ScreenCapture] Successfully captured viewport to {OUTPUT_FILENAME} ({size_kb:.1f} KB)")
        sys.exit(0)
    else:
        print("[ScreenCapture] Error: Could not save viewport capture.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
