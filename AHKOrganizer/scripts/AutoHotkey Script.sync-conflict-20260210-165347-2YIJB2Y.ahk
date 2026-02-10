toggle := false
targetWindow := "ahk_exe SoTGame.exe" ; <<< УКАЖИ НУЖНОЕ ОКНО

F1:: ; клавиша вкл/выкл
toggle := !toggle

if (toggle) {
    SetTimer, DoAction, 10
} else {
    SetTimer, DoAction, Off
}
return

DoAction:
    ; Проверка активного окна
    if !WinActive(targetWindow)
        return

    ; Нажать F + X одновременно
    Send, {f down}{x down}
    Sleep, 50
    Send, {f up}{x up}
    Send, {x down}
    Sleep, 50
    Send, {x up}

    ; Зажать F на 1.5 секунды
    Send, {f down}
    Sleep, 1500
    Send, {f up}
return