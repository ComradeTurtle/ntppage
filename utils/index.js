export const secondsToSubmultiples = (s) => {
    // convert seconds to ms, us, or ns depending on the value.
    // if the value is less than 1ms, convert to us
    // if the value is less than 1us, convert to ns
    if (s < 0.000001) {
        return {
            value: (s * 1000000000).toFixed(3),
            unit: 'ns'
        };
    } else if (s < 0.001) {
        return {
            value: (s * 1000000).toFixed(3),
            unit: 'μs'
        };
    } else if (s < 1000) {
        return {
            value: (s * 1000).toFixed(3),
            unit: 'ms'
        };
    } else {
        return {
            value: s,
            unit: 's'
        };
    }
}

export const offsetFormat = (offset) => {
    if (offset < 0) {
        return `${Math.abs(offset)}ms ahead`
    } else if (offset === 0) {
      return `exactly in sync!`
    } else {
        return `${offset}ms behind`
    }
}