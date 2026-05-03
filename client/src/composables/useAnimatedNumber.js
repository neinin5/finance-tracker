import { ref, watch } from 'vue'

/** Smoothly animate a numeric value when source changes. */
export function useAnimatedNumber(source, { duration = 800 } = {}) {
  const display = ref(typeof source.value === 'number' ? source.value : 0)
  let raf = null
  let startTime = 0
  let startVal = display.value
  let endVal = display.value

  function tick(now) {
    if (!startTime) startTime = now
    const t = Math.min(1, (now - startTime) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    display.value = startVal + (endVal - startVal) * eased
    if (t < 1) raf = requestAnimationFrame(tick)
    else raf = null
  }

  watch(source, (val) => {
    if (typeof val !== 'number' || isNaN(val)) return
    startVal = display.value
    endVal = val
    startTime = 0
    if (raf) cancelAnimationFrame(raf)
    raf = requestAnimationFrame(tick)
  }, { immediate: false })

  return display
}
