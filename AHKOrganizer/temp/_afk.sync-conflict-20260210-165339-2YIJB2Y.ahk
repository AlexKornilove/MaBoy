#Warn All, Off
#Requires AutoHotkey v2.0
#SingleInstance Force

FileAppend("AHK_LINE_INFO:afk.ahk:5\n", "*")
targetWindow := "ahk_exe SoTGame.exe"
FileAppend("AHK_LINE_INFO:afk.ahk:6\n", "*")
running := false
FileAppend("AHK_LINE_INFO:afk.ahk:7\n", "*")
wasActive := false

F8::
{
FileAppend("AHK_LINE_INFO:afk.ahk:11\n", "*")
    global running
FileAppend("AHK_LINE_INFO:afk.ahk:12\n", "*")
    running := !running

    if (running)
    {
FileAppend("AHK_LINE_INFO:afk.ahk:16\n", "*")
        ToolTip "Скрипт ЗАПУЩЕН"
FileAppend("AHK_LINE_INFO:afk.ahk:17\n", "*")
        SetTimer(Work, 300000)       ; 5 минут
FileAppend("AHK_LINE_INFO:afk.ahk:18\n", "*")
        SetTimer(CheckWindow, 500)   ; слежение за окном
FileAppend("AHK_LINE_INFO:afk.ahk:19\n", "*")
        Work()
    }
    else
    {
FileAppend("AHK_LINE_INFO:afk.ahk:23\n", "*")
        ToolTip "Скрипт ОСТАНОВЛЕН"
FileAppend("AHK_LINE_INFO:afk.ahk:24\n", "*")
        SetTimer(Work, 0)
FileAppend("AHK_LINE_INFO:afk.ahk:25\n", "*")
        SetTimer(CheckWindow, 0)
    }

FileAppend("AHK_LINE_INFO:afk.ahk:28\n", "*")
    SetTimer(() => ToolTip(), -1000)
}

FileAppend("AHK_LINE_INFO:afk.ahk:31\n", "*")
CheckWindow()
{
FileAppend("AHK_LINE_INFO:afk.ahk:33\n", "*")
    global running, wasActive, targetWindow

    if (!running)
FileAppend("AHK_LINE_INFO:afk.ahk:36\n", "*")
        return

FileAppend("AHK_LINE_INFO:afk.ahk:38\n", "*")
    isActive := WinActive(targetWindow)

    if (isActive && !wasActive)
FileAppend("AHK_LINE_INFO:afk.ahk:41\n", "*")
        Work()

FileAppend("AHK_LINE_INFO:afk.ahk:43\n", "*")
    wasActive := isActive
}

FileAppend("AHK_LINE_INFO:afk.ahk:46\n", "*")
Work()
{
FileAppend("AHK_LINE_INFO:afk.ahk:48\n", "*")
    global running, targetWindow

    if (!running || !WinActive(targetWindow))
FileAppend("AHK_LINE_INFO:afk.ahk:51\n", "*")
        return

FileAppend("AHK_LINE_INFO:afk.ahk:53\n", "*")
    Send "{Ctrl down}{q down}"
FileAppend("AHK_LINE_INFO:afk.ahk:54\n", "*")
    Sleep 200
FileAppend("AHK_LINE_INFO:afk.ahk:55\n", "*")
    Send "1"
FileAppend("AHK_LINE_INFO:afk.ahk:56\n", "*")
    Sleep 1800
FileAppend("AHK_LINE_INFO:afk.ahk:57\n", "*")
    Send "{q up}{Ctrl up}"

FileAppend("AHK_LINE_INFO:afk.ahk:59\n", "*")
    MouseMove 60, 0, 0, "R"

FileAppend("AHK_LINE_INFO:afk.ahk:61\n", "*")
    Send "{w down}"
FileAppend("AHK_LINE_INFO:afk.ahk:62\n", "*")
    Sleep 2000
FileAppend("AHK_LINE_INFO:afk.ahk:63\n", "*")
    Send "{w up}"
}

FileAppend("AHK_LINE_INFO:afk.ahk:66\n", "*")
Esc::ExitApp