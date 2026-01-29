FileAppend, AHK_LINE_INFO:Untitled.ahk:1`n, *
toggle := false

FileAppend, AHK_LINE_INFO:Untitled.ahk:3`n, *
F1:: ; вкл / выкл
FileAppend, AHK_LINE_INFO:Untitled.ahk:4`n, *
toggle := !toggle

FileAppend, AHK_LINE_INFO:Untitled.ahk:6`n, *
if (toggle) {
FileAppend, AHK_LINE_INFO:Untitled.ahk:7`n, *
    SetTimer, DoAction, 10
FileAppend, AHK_LINE_INFO:Untitled.ahk:8`n, *
} else {
FileAppend, AHK_LINE_INFO:Untitled.ahk:9`n, *
    SetTimer, DoAction, Off
FileAppend, AHK_LINE_INFO:Untitled.ahk:10`n, *
}
FileAppend, AHK_LINE_INFO:Untitled.ahk:11`n, *
return

FileAppend, AHK_LINE_INFO:Untitled.ahk:13`n, *
DoAction:

    ; Нажать R
FileAppend, AHK_LINE_INFO:Untitled.ahk:16`n, *
    Send, {r down}
FileAppend, AHK_LINE_INFO:Untitled.ahk:17`n, *
    Sleep, 2000
FileAppend, AHK_LINE_INFO:Untitled.ahk:18`n, *
    Send, {r up}

    ; Нажать X
FileAppend, AHK_LINE_INFO:Untitled.ahk:21`n, *
    Send, {x down}
FileAppend, AHK_LINE_INFO:Untitled.ahk:22`n, *
    Sleep, 50
FileAppend, AHK_LINE_INFO:Untitled.ahk:23`n, *
    Send, {x up}

    ; Зажать F
FileAppend, AHK_LINE_INFO:Untitled.ahk:26`n, *
    Send, {f down}
FileAppend, AHK_LINE_INFO:Untitled.ahk:27`n, *
    Sleep, 1000
FileAppend, AHK_LINE_INFO:Untitled.ahk:28`n, *
    Send, {f up}

FileAppend, AHK_LINE_INFO:Untitled.ahk:30`n, *
    Sleep, 200
FileAppend, AHK_LINE_INFO:Untitled.ahk:31`n, *
return
