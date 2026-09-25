// Piezas SVG de la plantilla D · Elite (plantillas/d-elite): el bidón, la luz del agua
// y la marca. Son dibujos fijos, se insertan tal cual con dangerouslySetInnerHTML.
// Los ids internos (bdClip, causA…) solo pueden aparecer una vez por página.

export const SVG_BIDON = `<svg aria-hidden="true" focusable="false" viewBox="0 0 640 1200" preserveAspectRatio="xMidYMin meet" style="width:100%;height:auto;overflow:visible;display:block">
    <defs>
      <clipPath id="bdClip"><path d="M266 98 L266 168 C266 236 10 244 10 384 L10 1160 Q10 1198 48 1198 L592 1198 Q630 1198 630 1160 L630 384 C630 244 374 236 374 168 L374 98 Z"></path></clipPath>
      <clipPath id="bdWater"><path d="M34 316 A286 22 0 0 1 606 316 L640 316 L640 1200 L0 1200 L0 316 Z"></path></clipPath>
      <linearGradient id="bdGlass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#A8E6FF" stop-opacity=".5"></stop>
        <stop offset=".1" stop-color="#4A90E6" stop-opacity=".14"></stop>
        <stop offset=".5" stop-color="#2A68D0" stop-opacity=".06"></stop>
        <stop offset=".9" stop-color="#4A90E6" stop-opacity=".16"></stop>
        <stop offset="1" stop-color="#CDEEFF" stop-opacity=".55"></stop>
      </linearGradient>
      <linearGradient id="bdWaterV" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4AA2F3" stop-opacity=".9"></stop>
        <stop offset=".18" stop-color="#2567D6" stop-opacity=".88"></stop>
        <stop offset=".55" stop-color="#154AB4" stop-opacity=".9"></stop>
        <stop offset="1" stop-color="#092773" stop-opacity=".95"></stop>
      </linearGradient>
      <linearGradient id="bdVolume" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#01092A" stop-opacity=".8"></stop>
        <stop offset=".08" stop-color="#01092A" stop-opacity=".42"></stop>
        <stop offset=".24" stop-color="#01092A" stop-opacity="0"></stop>
        <stop offset=".7" stop-color="#01092A" stop-opacity="0"></stop>
        <stop offset=".9" stop-color="#01092A" stop-opacity=".4"></stop>
        <stop offset="1" stop-color="#01092A" stop-opacity=".82"></stop>
      </linearGradient>
      <linearGradient id="bdFocus" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#CFF3FF" stop-opacity="0"></stop>
        <stop offset=".5" stop-color="#CFF3FF" stop-opacity=".3"></stop>
        <stop offset="1" stop-color="#CFF3FF" stop-opacity="0"></stop>
      </linearGradient>
      <linearGradient id="bdSpec" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"></stop>
        <stop offset=".06" stop-color="#FFFFFF" stop-opacity=".95"></stop>
        <stop offset=".5" stop-color="#FFFFFF" stop-opacity=".55"></stop>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity=".08"></stop>
      </linearGradient>
      <linearGradient id="bdNeck" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#CDEEFF" stop-opacity=".42"></stop>
        <stop offset=".2" stop-color="#7FB8F0" stop-opacity=".1"></stop>
        <stop offset=".7" stop-color="#7FB8F0" stop-opacity=".05"></stop>
        <stop offset="1" stop-color="#E6F7FF" stop-opacity=".45"></stop>
      </linearGradient>
      <linearGradient id="bdCap" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#6F7F96"></stop>
        <stop offset=".14" stop-color="#E9EFF6"></stop>
        <stop offset=".3" stop-color="#A9B6C7"></stop>
        <stop offset=".52" stop-color="#F7FAFD"></stop>
        <stop offset=".74" stop-color="#95A3B6"></stop>
        <stop offset=".9" stop-color="#D5DEE8"></stop>
        <stop offset="1" stop-color="#56657C"></stop>
      </linearGradient>
      <linearGradient id="bdCapTop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity=".9"></stop>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop>
      </linearGradient>
      <filter id="bdBlur8" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"></feGaussianBlur></filter>
      <filter id="bdBlur3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"></feGaussianBlur></filter>
      <filter id="bdCaus" x="0" y="0" width="760" height="1100" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        <feTurbulence type="turbulence" baseFrequency="0.02 0.0085" numOctaves="1" seed="23"></feTurbulence>
        <feColorMatrix type="matrix" values="0 0 0 0 0.82  0 0 0 0 0.96  0 0 0 0 1  -18 0 0 0 1.0"></feColorMatrix>
        <feGaussianBlur stdDeviation="0.6" result="core"></feGaussianBlur>
        <feGaussianBlur in="core" stdDeviation="4" result="glow"></feGaussianBlur>
        <feMerge><feMergeNode in="glow"></feMergeNode><feMergeNode in="glow"></feMergeNode><feMergeNode in="core"></feMergeNode></feMerge>
      </filter>
    </defs>
    <path d="M266 98 L266 168 C266 236 10 244 10 384 L10 1160 Q10 1198 48 1198 L592 1198 Q630 1198 630 1160 L630 384 C630 244 374 236 374 168 L374 98 Z" fill="none" stroke="#8FD6FF" stroke-opacity=".42" stroke-width="16" filter="url(#bdBlur8)"></path>
    <g clip-path="url(#bdClip)">
      <rect x="0" y="0" width="640" height="1200" fill="url(#bdGlass)"></rect>
      <rect x="266" y="96" width="108" height="76" fill="url(#bdNeck)"></rect>
      <rect x="266" y="104" width="108" height="14" fill="#021032" opacity=".45" filter="url(#bdBlur3)"></rect>
      <g clip-path="url(#bdWater)">
        <rect x="0" y="280" width="640" height="920" fill="url(#bdWaterV)"></rect>
        <g style="mix-blend-mode: screen;">
          <rect class="drift-c" x="-60" y="240" width="760" height="1100" filter="url(#bdCaus)" opacity=".42"></rect>
        </g>
        <rect x="290" y="300" width="170" height="900" fill="url(#bdFocus)"></rect>
        <g transform="translate(150 720)"><g class="bub" style="animation-duration: 7.5s; animation-delay: -1.2s;"><circle r="11" fill="#D2F0FF" fill-opacity=".12" stroke="#EAF9FF" stroke-opacity=".85" stroke-width="1.6"></circle><circle cx="-3.6" cy="-3.8" r="2.6" fill="#FFFFFF" opacity=".95"></circle></g></g>
        <g transform="translate(214 690)"><g class="bub" style="animation-duration: 6s; animation-delay: -4.1s;"><circle r="6" fill="#D2F0FF" fill-opacity=".12" stroke="#EAF9FF" stroke-opacity=".85" stroke-width="1.3"></circle><circle cx="-2" cy="-2.1" r="1.5" fill="#FFFFFF" opacity=".95"></circle></g></g>
        <g transform="translate(270 780)"><g class="bub" style="animation-duration: 8.5s; animation-delay: -6.3s;"><circle r="16" fill="#D2F0FF" fill-opacity=".1" stroke="#EAF9FF" stroke-opacity=".8" stroke-width="1.7"></circle><circle cx="-5.4" cy="-5.6" r="3.4" fill="#FFFFFF" opacity=".9"></circle></g></g>
        <g transform="translate(336 700)"><g class="bub" style="animation-duration: 6.8s; animation-delay: -2.6s;"><circle r="5" fill="#D2F0FF" fill-opacity=".12" stroke="#EAF9FF" stroke-opacity=".9" stroke-width="1.2"></circle></g></g>
        <g transform="translate(380 800)"><g class="bub" style="animation-duration: 9s; animation-delay: -3.5s;"><circle r="9" fill="#D2F0FF" fill-opacity=".12" stroke="#EAF9FF" stroke-opacity=".85" stroke-width="1.5"></circle><circle cx="-3" cy="-3.2" r="2" fill="#FFFFFF" opacity=".95"></circle></g></g>
        <g transform="translate(430 680)"><g class="bub" style="animation-duration: 7.2s; animation-delay: -5.4s;"><circle r="13" fill="#D2F0FF" fill-opacity=".1" stroke="#EAF9FF" stroke-opacity=".8" stroke-width="1.6"></circle><circle cx="-4.4" cy="-4.5" r="2.8" fill="#FFFFFF" opacity=".9"></circle></g></g>
        <g transform="translate(482 770)"><g class="bub" style="animation-duration: 6.4s; animation-delay: -0.4s;"><circle r="7" fill="#D2F0FF" fill-opacity=".12" stroke="#EAF9FF" stroke-opacity=".85" stroke-width="1.3"></circle><circle cx="-2.3" cy="-2.5" r="1.7" fill="#FFFFFF" opacity=".95"></circle></g></g>
        <g transform="translate(528 700)"><g class="bub" style="animation-duration: 8s; animation-delay: -2s;"><circle r="4.5" fill="#D2F0FF" fill-opacity=".12" stroke="#EAF9FF" stroke-opacity=".9" stroke-width="1.2"></circle></g></g>
        <g transform="translate(560 790)"><g class="bub" style="animation-duration: 7.6s; animation-delay: -5s;"><circle r="10" fill="#D2F0FF" fill-opacity=".1" stroke="#EAF9FF" stroke-opacity=".8" stroke-width="1.5"></circle><circle cx="-3.3" cy="-3.4" r="2.2" fill="#FFFFFF" opacity=".9"></circle></g></g>
        <g transform="translate(100 800)"><g class="bub" style="animation-duration: 8.8s; animation-delay: -7.4s;"><circle r="7" fill="#D2F0FF" fill-opacity=".12" stroke="#EAF9FF" stroke-opacity=".85" stroke-width="1.3"></circle><circle cx="-2.3" cy="-2.4" r="1.6" fill="#FFFFFF" opacity=".95"></circle></g></g>
        <g transform="translate(456 740)"><g class="bub" style="animation-duration: 5.6s; animation-delay: -1s;"><circle r="3" fill="#EAF9FF" fill-opacity=".5"></circle></g></g>
        <g transform="translate(460 740)"><g class="bub" style="animation-duration: 5.6s; animation-delay: -2.4s;"><circle r="3.5" fill="#EAF9FF" fill-opacity=".5"></circle></g></g>
        <g transform="translate(452 740)"><g class="bub" style="animation-duration: 5.6s; animation-delay: -3.8s;"><circle r="2.6" fill="#EAF9FF" fill-opacity=".5"></circle></g></g>
        <g transform="translate(458 740)"><g class="bub" style="animation-duration: 5.6s; animation-delay: -5.1s;"><circle r="4" fill="#EAF9FF" fill-opacity=".45"></circle></g></g>
      </g>
      <ellipse cx="320" cy="316" rx="286" ry="22" fill="#CDEFFF" fill-opacity=".22"></ellipse>
      <path d="M34 316 A286 22 0 0 1 606 316" fill="none" stroke="#DDF4FF" stroke-opacity=".5" stroke-width="1.3"></path>
      <path d="M34 316 A286 22 0 0 0 606 316" fill="none" stroke="#BFEAFF" stroke-opacity=".5" stroke-width="9" filter="url(#bdBlur3)"></path>
      <path d="M34 316 A286 22 0 0 0 606 316" fill="none" stroke="#F4FCFF" stroke-opacity=".95" stroke-width="2.6"></path>
      <rect x="0" y="0" width="640" height="1200" fill="url(#bdVolume)"></rect>
      <g fill="none">
        <path d="M10 480 Q320 516 630 480" stroke="#01092A" stroke-opacity=".6" stroke-width="12" filter="url(#bdBlur3)"></path>
        <path d="M10 490 Q320 526 630 490" stroke="#E8F8FF" stroke-opacity=".75" stroke-width="1.8"></path>
        <path d="M10 640 Q320 676 630 640" stroke="#01092A" stroke-opacity=".6" stroke-width="12" filter="url(#bdBlur3)"></path>
        <path d="M10 650 Q320 686 630 650" stroke="#E8F8FF" stroke-opacity=".7" stroke-width="1.8"></path>
        <path d="M10 800 Q320 836 630 800" stroke="#01092A" stroke-opacity=".6" stroke-width="12" filter="url(#bdBlur3)"></path>
        <path d="M10 810 Q320 846 630 810" stroke="#E8F8FF" stroke-opacity=".65" stroke-width="1.8"></path>
        <path d="M10 960 Q320 996 630 960" stroke="#01092A" stroke-opacity=".6" stroke-width="12" filter="url(#bdBlur3)"></path>
        <path d="M10 970 Q320 1006 630 970" stroke="#E8F8FF" stroke-opacity=".6" stroke-width="1.8"></path>
      </g>
      <rect x="52" y="396" width="48" height="800" rx="8" fill="url(#bdSpec)" opacity=".38" filter="url(#bdBlur8)"></rect>
      <rect x="60" y="400" width="34" height="800" rx="6" fill="url(#bdSpec)" opacity=".6"></rect>
      <rect x="112" y="420" width="4" height="760" rx="2" fill="#FFFFFF" opacity=".45"></rect>
      <rect x="546" y="410" width="22" height="770" rx="11" fill="url(#bdSpec)" opacity=".55" filter="url(#bdBlur3)"></rect>
      <path d="M254 190 C248 250 80 262 46 352" fill="none" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="10" stroke-linecap="round" filter="url(#bdBlur3)"></path>
      <path d="M258 196 C252 254 92 266 58 350" fill="none" stroke="#FFFFFF" stroke-opacity=".85" stroke-width="2.2" stroke-linecap="round"></path>
      <path d="M386 196 C420 248 566 268 604 330" fill="none" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="5" stroke-linecap="round" filter="url(#bdBlur3)"></path>
      <rect x="279" y="112" width="6" height="66" rx="3" fill="url(#bdSpec)" opacity=".75"></rect>
      <rect x="356" y="112" width="3" height="60" rx="1.5" fill="url(#bdSpec)" opacity=".5"></rect>
    </g>
    <path d="M266 98 L266 168 C266 236 10 244 10 384 L10 1160 Q10 1198 48 1198 L592 1198 Q630 1198 630 1160 L630 384 C630 244 374 236 374 168 L374 98 Z" fill="none" stroke="#CFEFFF" stroke-opacity=".7" stroke-width="2.2"></path>
    <path d="M266 98 L266 168 C266 236 10 244 10 384 L10 1160" fill="none" stroke="#A6ECFA" stroke-opacity=".95" stroke-width="3"></path>
    <path d="M374 98 L374 168 C374 236 630 244 630 384 L630 1160" fill="none" stroke="#F2FBFF" stroke-opacity=".95" stroke-width="2.8"></path>
    <rect x="250" y="120" width="140" height="15" rx="7.5" fill="#CFEFFF" fill-opacity=".3" stroke="#EAF9FF" stroke-opacity=".75" stroke-width="1.3"></rect>
    <rect x="258" y="123" width="50" height="3.5" rx="1.75" fill="#FFFFFF" opacity=".7"></rect>
    <rect x="242" y="88" width="156" height="22" rx="7" fill="url(#bdCap)"></rect>
    <rect x="248" y="6" width="144" height="88" rx="16" fill="url(#bdCap)"></rect>
    <g stroke="#3E4C62" stroke-opacity=".3" stroke-width="1.4">
      <path d="M262 22 V84"></path><path d="M274 20 V86"></path><path d="M286 20 V86"></path><path d="M298 20 V86"></path><path d="M310 20 V86"></path><path d="M322 20 V86"></path><path d="M334 20 V86"></path><path d="M346 20 V86"></path><path d="M358 20 V86"></path><path d="M370 20 V86"></path><path d="M382 22 V84"></path>
    </g>
    <rect x="252" y="8" width="136" height="16" rx="8" fill="url(#bdCapTop)" opacity=".7"></rect>
    <rect x="248" y="6" width="144" height="88" rx="16" fill="none" stroke="#FFFFFF" stroke-opacity=".4" stroke-width="1"></rect>
  </svg>`

export const SVG_CAUSTICAS = `<svg class="drift-a" width="1900" height="1300" viewBox="0 0 1900 1300" style="position:absolute;left:-10%;top:-20%;opacity:.5">
<defs>
<filter id="causA" x="0" y="0" width="1900" height="1300" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feTurbulence type="turbulence" baseFrequency="0.0048 0.0062" numOctaves="1" seed="11"></feTurbulence>
<feColorMatrix type="matrix" values="0 0 0 0 0.70  0 0 0 0 0.93  0 0 0 0 1  -24 0 0 0 1.0"></feColorMatrix>
<feGaussianBlur stdDeviation="0.7" result="core"></feGaussianBlur>
<feGaussianBlur in="core" stdDeviation="5" result="glow"></feGaussianBlur>
<feMerge><feMergeNode in="glow"></feMergeNode><feMergeNode in="glow"></feMergeNode><feMergeNode in="core"></feMergeNode></feMerge>
</filter>
</defs>
<rect width="1900" height="1300" filter="url(#causA)"></rect>
</svg>
<svg class="drift-b" width="1900" height="1300" viewBox="0 0 1900 1300" style="position:absolute;left:-20%;top:-14%;opacity:.34">
<defs>
<filter id="causB" x="0" y="0" width="1900" height="1300" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feTurbulence type="turbulence" baseFrequency="0.003 0.004" numOctaves="1" seed="4"></feTurbulence>
<feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.85  0 0 0 0 1  -20 0 0 0 1.0"></feColorMatrix>
<feGaussianBlur stdDeviation="1.2" result="core"></feGaussianBlur>
<feGaussianBlur in="core" stdDeviation="9" result="glow"></feGaussianBlur>
<feMerge><feMergeNode in="glow"></feMergeNode><feMergeNode in="glow"></feMergeNode><feMergeNode in="core"></feMergeNode></feMerge>
</filter>
</defs>
<rect width="1900" height="1300" filter="url(#causB)"></rect>
</svg>`

export const SVG_MARCA = `<svg width="100%" height="100%" focusable="false" viewBox="0 0 40 40" aria-hidden="true">
<defs>
<clipPath id="mkLow"><rect x="0" y="22" width="40" height="18"></rect></clipPath>
<linearGradient id="mkRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2F7FC"></stop><stop offset=".5" stop-color="#8E9DB2"></stop><stop offset="1" stop-color="#E4ECF5"></stop></linearGradient>
</defs>
<circle cx="20" cy="20" r="19" fill="none" stroke="url(#mkRing)" stroke-width="1.2"></circle>
<path d="M20 8 C16.4 13 12.6 17.2 12.6 22.6 A7.4 7.4 0 0 0 27.4 22.6 C27.4 17.2 23.6 13 20 8 Z" fill="none" stroke="#EAF4FF" stroke-width="1.3"></path>
<path d="M20 8 C16.4 13 12.6 17.2 12.6 22.6 A7.4 7.4 0 0 0 27.4 22.6 C27.4 17.2 23.6 13 20 8 Z" fill="#A8E4F0" clip-path="url(#mkLow)"></path>
<path d="M11.5 22 H28.5" stroke="#EAF4FF" stroke-width="1.1"></path>
</svg>`
