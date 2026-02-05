#Requires AutoHotkey v2.0
#SingleInstance Force

FileAppend("AHK_LINE_INFO:new_script.ahk:4\n", "*")
targetWindow := "ahk_exe SoTGame.exe"
FileAppend("AHK_LINE_INFO:new_script.ahk:5\n", "*")
running := false
FileAppend("AHK_LINE_INFO:new_script.ahk:6\n", "*")
wasActive := false

FileAppend("AHK_LINE_INFO:new_script.ahk:8\n", "*")
F8::
FileAppend("AHK_LINE_INFO:new_script.ahk:9\n", "*")
{
FileAppend("AHK_LINE_INFO:new_script.ahk:10\n", "*")
    global running
FileAppend("AHK_LINE_INFO:new_script.ahk:11\n", "*")
    running := !running

FileAppend("AHK_LINE_INFO:new_script.ahk:13\n", "*")
    if (running)
FileAppend("AHK_LINE_INFO:new_script.ahk:14\n", "*")
    {
FileAppend("AHK_LINE_INFO:new_script.ahk:15\n", "*")
        ToolTip "Скрипт ЗАПУЩЕН"
FileAppend("AHK_LINE_INFO:new_script.ahk:16\n", "*")
        SetTimer(Work, 300000)       ; 5 минут
FileAppend("AHK_LINE_INFO:new_script.ahk:17\n", "*")
        SetTimer(CheckWindow, 500)   ; слежение за окном
FileAppend("AHK_LINE_INFO:new_script.ahk:18\n", "*")
        Work()
FileAppend("AHK_LINE_INFO:new_script.ahk:19\n", "*")
    }
FileAppend("AHK_LINE_INFO:new_script.ahk:20\n", "*")
    else
FileAppend("AHK_LINE_INFO:new_script.ahk:21\n", "*")
    {
FileAppend("AHK_LINE_INFO:new_script.ahk:22\n", "*")
        ToolTip "Скрипт ОСТАНОВЛЕН"
FileAppend("AHK_LINE_INFO:new_script.ahk:23\n", "*")
        SetTimer(Work, 0)
FileAppend("AHK_LINE_INFO:new_script.ahk:24\n", "*")
        SetTimer(CheckWindow, 0)
FileAppend("AHK_LINE_INFO:new_script.ahk:25\n", "*")
    }

FileAppend("AHK_LINE_INFO:new_script.ahk:27\n", "*")
    SetTimer(() => ToolTip(), -1000)
FileAppend("AHK_LINE_INFO:new_script.ahk:28\n", "*")
}

FileAppend("AHK_LINE_INFO:new_script.ahk:30\n", "*")
CheckWindow()
FileAppend("AHK_LINE_INFO:new_script.ahk:31\n", "*")
{
FileAppend("AHK_LINE_INFO:new_script.ahk:32\n", "*")
    global running, wasActive, targetWindow

FileAppend("AHK_LINE_INFO:new_script.ahk:34\n", "*")
    if (!running)
FileAppend("AHK_LINE_INFO:new_script.ahk:35\n", "*")
        return

FileAppend("AHK_LINE_INFO:new_script.ahk:37\n", "*")
    isActive := WinActive(targetWindow)

FileAppend("AHK_LINE_INFO:new_script.ahk:39\n", "*")
    if (isActive && !wasActive)
FileAppend("AHK_LINE_INFO:new_script.ahk:40\n", "*")
        Work()

FileAppend("AHK_LINE_INFO:new_script.ahk:42\n", "*")
    wasActive := isActive
FileAppend("AHK_LINE_INFO:new_script.ahk:43\n", "*")
}

FileAppend("AHK_LINE_INFO:new_script.ahk:45\n", "*")
Work()
FileAppend("AHK_LINE_INFO:new_script.ahk:46\n", "*")
{
FileAppend("AHK_LINE_INFO:new_script.ahk:47\n", "*")
    global running, targetWindow

FileAppend("AHK_LINE_INFO:new_script.ahk:49\n", "*")
    if (!running || !WinActive(targetWindow))
FileAppend("AHK_LINE_INFO:new_script.ahk:50\n", "*")
        return

FileAppend("AHK_LINE_INFO:new_script.ahk:52\n", "*")
    Send "{Ctrl down}{q down}"
FileAppend("AHK_LINE_INFO:new_script.ahk:53\n", "*")
    Sleep 200
FileAppend("AHK_LINE_INFO:new_script.ahk:54\n", "*")
    Send "1"
FileAppend("AHK_LINE_INFO:new_script.ahk:55\n", "*")
    Sleep 1800
FileAppend("AHK_LINE_INFO:new_script.ahk:56\n", "*")
    Send "{q up}{Ctrl up}"

FileAppend("AHK_LINE_INFO:new_script.ahk:58\n", "*")
    MouseMove 60, 0, 0, "R"

FileAppend("AHK_LINE_INFO:new_script.ahk:60\n", "*")
    Send "{w down}"
FileAppend("AHK_LINE_INFO:new_script.ahk:61\n", "*")
    Sleep 2000
FileAppend("AHK_LINE_INFO:new_script.ahk:62\n", "*")
    Send "{w up}"
FileAppend("AHK_LINE_INFO:new_script.ahk:63\n", "*")
}

FileAppend("AHK_LINE_INFO:new_script.ahk:65\n", "*")
Esc::ExitApp