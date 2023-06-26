module.exports = class Util {

  static hslToRgb (h, s, l) {
    // Achromatic
    if (s === 0) return [l, l, l]
    h /= 360
  
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s
    var p = 2 * l - q
  
    return [
      Math.round(this.hueToRgb(p, q, h + 1/3) * 255),
      Math.round(this.hueToRgb(p, q, h) * 255),
      Math.round(this.hueToRgb(p, q, h - 1/3) * 255)
    ]
  }
  
  /**
   * Helpers
   */
  static hueToRgb (p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  
    return p;
  }

  static rgbToHsl(r,g,b) {
    r = r/255;
    g = g/255;
    b = b/255;
    let v=Math.max(r,g,b), c=v-Math.min(r,g,b), f=(1-Math.abs(v+v-c-1)); 
    let h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
    return [60*(h<0?h+6:h), f ? c/f : 0, (v+v-c)/2];
  }

}