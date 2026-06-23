<!-- inbox: type=note; status=today -->
# 📥 Research inbox

A NodeNote file is just Markdown. Open it with **Open With… → NodeNote** to see cards; open it with
the normal text editor to see the source below.

<!-- inbox: type=question; status=today,important; id=q1 -->
## How does FMCW range resolution depend on chirp bandwidth?

Want the clean derivation plus the practical limit set by the ADC sample rate. Related: [[q2]].

<!-- inbox: type=answer; parent=q1; id=a1 -->
### bandwidth

Range resolution `Δr = c / (2·B)` — set only by sweep bandwidth `B`, independent of chirp time.

<!-- inbox: type=answer; parent=q1; id=a2 -->
### ADC limit

In practice capped by the ADC sample rate / max beat frequency.

<!-- inbox: type=question; status=parked; id=q2 -->
## Is a windowed FFT worth the SNR cost for our sidelobe target?

Parked until we have measured sidelobe levels.

<!-- inbox: type=note -->
## Plain note — not every card is a question

Cards with no question still take a status; they just don't show answer tabs.
