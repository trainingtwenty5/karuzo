# Plan testów ręcznych

## Cache ogłoszeń nieruchomości
1. Wyczyść pamięć podręczną przeglądarki (opcjonalnie w nowym oknie prywatnym).
2. Otwórz `oferty.html` i wybierz działkę z mapy, aby przejść do `details.html`.
3. Sprawdź w DevTools (zakładka Network), że pierwsze przejście do szczegółów wykonuje pojedynczy odczyt `getDoc` kolekcji `propertyListings`.
4. Wróć na mapę przyciskiem „Powrót do listy ofert”, a następnie ponownie otwórz te same szczegóły.
5. Zweryfikuj, że w Network brak kolejnego żądania `getDoc` (dane zostały obsłużone z cache).
6. W szczegółach przejdź do edycji (`edit.html`) i upewnij się, że również tutaj dane pojawiają się bez nowego `getDoc`.
7. Zmień wartość pola (np. opis dojazdu) i zapisz zmiany.
8. Wróć do `details.html` oraz ponownie na mapę; kolejne wejście w szczegóły powinno pokazywać zaktualizowane dane bez dodatkowego odczytu.
9. Opcjonalnie odśwież stronę `details.html` — powinien zostać wykonany tylko jeden odczyt `getDoc`, a dane powinny uwzględniać ostatnie zmiany.

## Odmowa dostępu do edycji
1. Zaloguj się kontem bez uprawnień do oferty.
2. Spróbuj otworzyć `edit.html` z identyfikatorem oferty, do której brak dostępu.
3. Aplikacja powinna zablokować edycję (komunikat o braku uprawnień i przekierowanie), a cache nie powinien ingerować w tę logikę.
