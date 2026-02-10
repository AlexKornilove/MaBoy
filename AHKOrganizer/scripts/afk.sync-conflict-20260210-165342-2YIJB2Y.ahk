#Warn All, Off
#Requires AutoHotkey v2.0
#SingleInstance Force

targetWindow := "ahk_exe SoTGame.exe"
running := false
wasActive := false

F8::
{
    global running
    running := !running

    if (running)
    {
        ToolTip "Скрипт ЗАПУЩЕН"
        SetTimer(Work, 300000)       ; 5 минут
        SetTimer(CheckWindow, 500)   ; слежение за окном
        Work()
    }
    else
    {
        ToolTip "Скрипт ОСТАНОВЛЕН"
        SetTimer(Work, 0)
        SetTimer(CheckWindow, 0)
    }

    SetTimer(() => ToolTip(), -1000)
}

CheckWindow()
{
    global running, wasActive, targetWindow

    if (!running)
        return

    isActive := WinActive(targetWindow)

    if (isActive && !wasActive)
        Work()

    wasActive := isActive
}

Work()
{
    global running, targetWindow

    if (!running || !WinActive(targetWindow))
        return

    Send "{Ctrl down}{q down}"
    Sleep 200
    Send "1"
    Sleep 1800
    Send "{q up}{Ctrl up}"

    MouseMove 60, 0, 0, "R"

    Send "{w down}"
    Sleep 2000
    Send "{w up}"
}

Esc::ExitApp