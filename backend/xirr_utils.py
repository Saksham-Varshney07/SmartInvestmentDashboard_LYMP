from datetime import datetime, timedelta
try:
    from scipy import optimize
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

def calculate_xirr(cash_flows):
    """
    cash_flows: list of tuples (date: datetime, amount: float)
    Negative amounts are investments (outflows), positive are returns (inflows).
    Returns annualized percentage (e.g., 18.5 for 18.5% p.a.) or 0.0 if not calculable.
    """
    if not cash_flows or len(cash_flows) < 2:
        return 0.0

    cleaned = []
    for dt, amt in cash_flows:
        if amt != 0:
            if not isinstance(dt, datetime):
                try:
                    dt = datetime.fromisoformat(str(dt).replace('Z', ''))
                except Exception:
                    continue
            cleaned.append((dt, float(amt)))

    if len(cleaned) < 2:
        return 0.0

    cleaned.sort(key=lambda x: x[0])
    t0 = cleaned[0][0]

    has_neg = any(amt < 0 for _, amt in cleaned)
    has_pos = any(amt > 0 for _, amt in cleaned)
    if not (has_neg and has_pos):
        return 0.0

    total_days = max((cleaned[-1][0] - t0).total_seconds() / 86400.0, 0.0)
    total_invested = sum(-amt for _, amt in cleaned if amt < 0)
    final_value = sum(amt for _, amt in cleaned if amt > 0)

    # For holding periods less than 14 days, return the absolute return
    # to avoid extreme compounding distortion (e.g. 5% in 1 day compounded 365 times)
    if total_days < 14:
        if total_invested > 0:
            abs_ret = ((final_value - total_invested) / total_invested) * 100.0
            return round(float(abs_ret), 2)
        return 0.0

    def npv(r):
        if r <= -1.0:
            return float('inf')
        total = 0.0
        for dt, amt in cleaned:
            days = (dt - t0).total_seconds() / 86400.0
            total += amt / ((1.0 + r) ** (days / 365.0))
        return total

    def npv_prime(r):
        if r <= -1.0:
            return float('-inf')
        total = 0.0
        for dt, amt in cleaned:
            days = (dt - t0).total_seconds() / 86400.0
            total -= (days / 365.0) * amt / ((1.0 + r) ** (days / 365.0 + 1.0))
        return total

    if HAS_SCIPY:
        for guess in [0.1, 0.05, 0.25, -0.05, 0.0]:
            try:
                rate = optimize.newton(npv, guess, fprime=npv_prime, maxiter=100, tol=1e-5)
                if -0.99 <= rate <= 10.0:
                    return round(float(rate) * 100, 2)
            except Exception:
                pass

        try:
            rate = optimize.brentq(npv, -0.95, 10.0, maxiter=100)
            return round(float(rate) * 100, 2)
        except Exception:
            pass

    # Pure Python Newton-Raphson fallback
    r = 0.1
    for _ in range(100):
        val = npv(r)
        if abs(val) < 1e-4:
            return round(r * 100, 2)
        deriv = npv_prime(r)
        if abs(deriv) < 1e-9:
            break
        r_new = r - val / deriv
        if r_new <= -0.99 or r_new > 10.0:
            break
        if abs(r_new - r) < 1e-6:
            return round(r_new * 100, 2)
        r = r_new

    if total_invested > 0 and final_value > 0:
        years = max(total_days / 365.0, 0.1)
        cagr = ((final_value / total_invested) ** (1.0 / years) - 1.0) * 100
        return round(float(min(max(cagr, -99.9), 999.9)), 2)

    return 0.0
