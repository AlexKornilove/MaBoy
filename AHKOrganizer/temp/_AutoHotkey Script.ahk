FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:1`n, *
toggle := false
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:2`n, *
targetWindow := "ahk_exe SoTGame.exe" ; <<< УКАЖИ НУЖНОЕ ОКНО

FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:4`n, *
F1:: ; клавиша вкл/выкл
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:5`n, *
toggle := !toggle

FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:7`n, *
if (toggle) {
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:8`n, *
    SetTimer, DoAction, 10
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:9`n, *
} else {
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:10`n, *
    SetTimer, DoAction, Off
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:11`n, *
}
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:12`n, *
return

FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:14`n, *
DoAction:
    ; Проверка активного окна
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:16`n, *
    if !WinActive(targetWindow)
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:17`n, *
        return

    ; Нажать F + X одновременно
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:20`n, *
    Send, {f down}{x down}
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:21`n, *
    Sleep, 50
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:22`n, *
    Send, {f up}{x up}
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:23`n, *
    Send, {x down}
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:24`n, *
    Sleep, 50
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:25`n, *
    Send, {x up}

    ; Зажать F на 1.5 секунды
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:28`n, *
    Send, {f down}
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:29`n, *
    Sleep, 1500
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:30`n, *
    Send, {f up}
FileAppend, AHK_LINE_INFO:AutoHotkey Script.ahk:31`n, *
return