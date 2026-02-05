#Requires AutoHotkey v2.0
#SingleInstance Force

FileAppend, AHK_LINE_INFO:afk_sot.ahk:4`n, *
running := false

FileAppend, AHK_LINE_INFO:afk_sot.ahk:6`n, *
F8::
FileAppend, AHK_LINE_INFO:afk_sot.ahk:7`n, *
{
FileAppend, AHK_LINE_INFO:afk_sot.ahk:8`n, *
    global running
FileAppend, AHK_LINE_INFO:afk_sot.ahk:9`n, *
    running := !running

FileAppend, AHK_LINE_INFO:afk_sot.ahk:11`n, *
    if (running)
FileAppend, AHK_LINE_INFO:afk_sot.ahk:12`n, *
    {
FileAppend, AHK_LINE_INFO:afk_sot.ahk:13`n, *
        ToolTip "Скрипт ЗАПУЩЕН"
FileAppend, AHK_LINE_INFO:afk_sot.ahk:14`n, *
        SetTimer(Work, 300000) ; 5 минут
FileAppend, AHK_LINE_INFO:afk_sot.ahk:15`n, *
        Work() ; выполнить сразу
FileAppend, AHK_LINE_INFO:afk_sot.ahk:16`n, *
    }
FileAppend, AHK_LINE_INFO:afk_sot.ahk:17`n, *
    else
FileAppend, AHK_LINE_INFO:afk_sot.ahk:18`n, *
    {
FileAppend, AHK_LINE_INFO:afk_sot.ahk:19`n, *
        ToolTip "Скрипт ОСТАНОВЛЕН"
FileAppend, AHK_LINE_INFO:afk_sot.ahk:20`n, *
        SetTimer(Work, 0)
FileAppend, AHK_LINE_INFO:afk_sot.ahk:21`n, *
    }

FileAppend, AHK_LINE_INFO:afk_sot.ahk:23`n, *
    SetTimer(() => ToolTip(), -1000)
FileAppend, AHK_LINE_INFO:afk_sot.ahk:24`n, *
}

FileAppend, AHK_LINE_INFO:afk_sot.ahk:26`n, *
Work()
FileAppend, AHK_LINE_INFO:afk_sot.ahk:27`n, *
{
FileAppend, AHK_LINE_INFO:afk_sot.ahk:28`n, *
    global running
FileAppend, AHK_LINE_INFO:afk_sot.ahk:29`n, *
    if (!running)
FileAppend, AHK_LINE_INFO:afk_sot.ahk:30`n, *
        return

    ; Ctrl + Q (2 секунды) + 1
FileAppend, AHK_LINE_INFO:afk_sot.ahk:33`n, *
    Send "{Ctrl down}{q down}"
FileAppend, AHK_LINE_INFO:afk_sot.ahk:34`n, *
    Sleep 200
FileAppend, AHK_LINE_INFO:afk_sot.ahk:35`n, *
    Send "1"
FileAppend, AHK_LINE_INFO:afk_sot.ahk:36`n, *
    Sleep 1800
FileAppend, AHK_LINE_INFO:afk_sot.ahk:37`n, *
    Send "{q up}{Ctrl up}"

    ; Поворот мыши
FileAppend, AHK_LINE_INFO:afk_sot.ahk:40`n, *
    MouseMove 60, 0, 0, "R"

    ; Движение вперёд (W) 2 секунды
FileAppend, AHK_LINE_INFO:afk_sot.ahk:43`n, *
    Send "{w down}"
FileAppend, AHK_LINE_INFO:afk_sot.ahk:44`n, *
    Sleep 2000
FileAppend, AHK_LINE_INFO:afk_sot.ahk:45`n, *
    Send "{w up}"
FileAppend, AHK_LINE_INFO:afk_sot.ahk:46`n, *
}

FileAppend, AHK_LINE_INFO:afk_sot.ahk:48`n, *
Esc::ExitApp
