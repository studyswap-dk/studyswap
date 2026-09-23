# Logo og ikoner

```
studyswap-mark.svg          mærket alene, #1E4FD8
studyswap-mark-black.svg    mærket i sort
studyswap-logo-curves.svg   mærke og navn, tekst som kurver
studyswap-logo-text.svg     mærke og navn, tekst som Manrope Bold
favicon/                    favicon og PWA-ikoner
```

## Hvilken fil hvornår

`studyswap-logo-curves.svg` er standardvalget. Teksten er kurver, så den
ser ens ud overalt uden at Manrope skal være installeret.

`studyswap-logo-text.svg` bruges kun hvis navnet skal rettes. Den kræver
Manrope Bold på den maskine der åbner den, ellers falder teksten tilbage
til en anden skrift.

## Skrifttype

Manrope, vægt Bold (700). SIL Open Font License.

I appen hentes den med `next/font/google`, ligesom Geist i `app/layout.tsx`.
Skrifttypefiler lægges ikke i repoet.

## Favicons

Appen bruger Next.js' filnavne i `app/`: `icon.svg` er lavet af
`favicon/favicon.svg`, og `apple-icon.png` af `favicon/apple-touch-icon-180.png`.
192 og 512 er til et PWA-manifest, hvis det bliver aktuelt.

## Farve

Primær: `#1E4FD8`
