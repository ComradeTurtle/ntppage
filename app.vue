<script setup>
  const definitions = useState("definitions");
  const statusClasses = useState("statusClasses");
  useState("currentTime");
  useState("socketData", () => null);

  definitions.value = {
    stratum: "The hierarchical level of the server (e.g., 1 for primary servers). Stratum 0 is reserved for reference clocks, while Stratum 16 is used for unsynchronized servers.",
    origin: "The source of the time signal (PPS = Pulse Per Second).",
    leapStatus: "Indicates if a leap second adjustment is scheduled. The status can be Normal, Insert Second, or Delete Second.",
    rootDispersion: "Root Dispersion provides an upper bound on how far the server’s time might deviate from the true time. It represents the maximum cumulative error between the NTP server’s clock and the reference clock it is synchronized to. It is expressed in seconds and includes factors like network jitter, synchronization stability, and hardware precision.",
    skew: "Skew is the estimated uncertainty or error in the Residual Frequency. It represents the variability or potential error in the frequency adjustment, also expressed in ppm. Skew gives an idea of how consistent the frequency corrections are over time.",
    residualFreq: "Residual Frequency is the fine-tuning adjustment being made to the system clock's frequency, expressed in parts per million (ppm).\nIt represents the small corrections applied by the NTP daemon to bring the server's clock closer to the reference clock.",
    rmsOffset: "RMS Offset is the average deviation of the system clock from the reference time source, calculated over a series of measurements. It is expressed in seconds and provides a measure of long-term synchronization stability."
  }

  statusClasses.value = {
    normal: "shadow-[0_0_20px_0_rgb(16,185,129)] border-emerald-500",
    warning: "shadow-[0_0_20px_0_rgb(234,204,21)] border-yellow-500",
    danger: "shadow-[0_0_20px_0_rgb(239,68,68)] border-red-500",
    active: "warning"
  };
</script>

<template>
  <NuxtPage />
</template>