/**
 * Financial calculation utilities including XIRR and currency formatting.
 */

/**
 * Calculates the Extended Internal Rate of Return (XIRR) from a series of cash flows.
 * @param {Array<{date: Date|string, amount: number}>} cashFlows 
 * Negative amounts represent investments (outflows), positive represent inflows / current value.
 * @returns {number} Annualized rate as percentage, e.g. 15.2 for 15.2% p.a.
 */
export function calculateClientXirr(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) return 0;

  const validFlows = cashFlows
    .map(cf => ({
      date: new Date(cf.date),
      amount: Number(cf.amount)
    }))
    .filter(cf => !isNaN(cf.date.getTime()) && !isNaN(cf.amount) && cf.amount !== 0)
    .sort((a, b) => a.date - b.date);

  if (validFlows.length < 2) return 0;

  const hasNegative = validFlows.some(cf => cf.amount < 0);
  const hasPositive = validFlows.some(cf => cf.amount > 0);
  if (!hasNegative || !hasPositive) return 0;

  const t0 = validFlows[0].date.getTime();

  const npv = (rate) => {
    if (rate <= -1) return Number.MAX_SAFE_INTEGER;
    let sum = 0;
    for (const cf of validFlows) {
      const days = (cf.date.getTime() - t0) / (1000 * 60 * 60 * 24);
      sum += cf.amount / Math.pow(1 + rate, days / 365);
    }
    return sum;
  };

  const npvDerivative = (rate) => {
    if (rate <= -1) return Number.MIN_SAFE_INTEGER;
    let sum = 0;
    for (const cf of validFlows) {
      const days = (cf.date.getTime() - t0) / (1000 * 60 * 60 * 24);
      const years = days / 365;
      sum -= (years * cf.amount) / Math.pow(1 + rate, years + 1);
    }
    return sum;
  };

  // Newton-Raphson with multiple starting guesses
  const guesses = [0.1, 0.05, 0.2, 0.0, -0.05, 0.5];
  for (const guess of guesses) {
    let r = guess;
    for (let i = 0; i < 100; i++) {
      const val = npv(r);
      if (Math.abs(val) < 1e-4) {
        return Number((r * 100).toFixed(2));
      }
      const deriv = npvDerivative(r);
      if (Math.abs(deriv) < 1e-8) break;
      const rNew = r - val / deriv;
      if (rNew <= -0.99 || rNew > 25.0) break; // keep in plausible bounds
      if (Math.abs(rNew - r) < 1e-6) {
        return Number((rNew * 100).toFixed(2));
      }
      r = rNew;
    }
  }

  const totalOutflows = Math.abs(validFlows.filter(c => c.amount < 0).reduce((sum, c) => sum + c.amount, 0));
  const totalInflows = validFlows.filter(c => c.amount > 0).reduce((sum, c) => sum + c.amount, 0);
  const totalDays = Math.max((validFlows[validFlows.length - 1].date.getTime() - t0) / (1000 * 60 * 60 * 24), 0);

  // For holding periods under 14 days, return absolute return to avoid unrealistic compounding
  if (totalDays < 14 && totalOutflows > 0) {
    const absRet = ((totalInflows - totalOutflows) / totalOutflows) * 100;
    return Number(absRet.toFixed(2));
  }

  const years = Math.max(totalDays / 365, 0.1);
  if (totalOutflows > 0 && totalInflows > 0) {
    const cagr = (Math.pow(totalInflows / totalOutflows, 1 / years) - 1) * 100;
    return Number(Math.min(Math.max(cagr, -99.9), 999.9).toFixed(2));
  }

  return 0;
}

export function formatINR(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(val || 0);
}

export function formatMarketCap(val) {
  if (!val || isNaN(val)) return 'N/A';
  // If in Rupee scale (> 10,000,000 = 1 Cr)
  if (val >= 1e12) {
    return `₹${(val / 1e12).toFixed(2)} Lakh Cr`;
  } else if (val >= 1e7) {
    return `₹${(val / 1e7).toFixed(2)} Cr`;
  } else if (val >= 1e5) {
    return `₹${(val / 1e5).toFixed(2)} Lakh`;
  }
  return formatINR(val);
}
