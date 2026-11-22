/**
 * LaTeX & mhchem Chemical Engineering Math Rendering Tests
 * Validates fractions, integrals, matrices, chemical reactions, units, mixed text+math, and error handling.
 */

// Type declarations for standalone test execution
declare const describe: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => void) => void;
declare const expect: (val: any) => any;

import { parseMathSegments } from '../../../lib/mathParse';

describe('LaTeX & Chemistry Math Parsing Suite', () => {
  test('Case 1: Standard fractions and square roots', () => {
    const input = 'Calculate the value of $\\frac{a + b}{\\sqrt{c^2 + d^2}}$ when $a=3$.';
    const segments = parseMathSegments(input);
    expect(segments.length).toBe(4);
    expect(segments[0]).toEqual({ type: 'text', content: 'Calculate the value of ' });
    expect(segments[1]).toEqual({ type: 'inline-math', content: '\\frac{a + b}{\\sqrt{c^2 + d^2}}' });
    expect(segments[2]).toEqual({ type: 'text', content: ' when ' });
    expect(segments[3]).toEqual({ type: 'inline-math', content: 'a=3' });
  });

  test('Case 2: Definite & Indefinite Integrals', () => {
    const input = 'The enthalpy is given by $$\\Delta H = \\int_{T_1}^{T_2} C_p\\,dT$$';
    const segments = parseMathSegments(input);
    expect(segments.length).toBe(2);
    expect(segments[0]).toEqual({ type: 'text', content: 'The enthalpy is given by ' });
    expect(segments[1]).toEqual({ type: 'block-math', content: '\\Delta H = \\int_{T_1}^{T_2} C_p\\,dT' });
  });

  test('Case 3: Matrices and determinants', () => {
    const input = 'Find the determinant of $$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$';
    const segments = parseMathSegments(input);
    expect(segments[1].type).toBe('block-math');
    expect(segments[1].content).toContain('\\begin{pmatrix}');
  });

  test('Case 4: Chemical reactions with mhchem \\ce{}', () => {
    const input = 'Consider the balanced reaction $\\ce{CH4 + 2O2 -> CO2 + 2H2O}$ at standard temperature.';
    const segments = parseMathSegments(input);
    expect(segments[1]).toEqual({
      type: 'inline-math',
      content: '\\ce{CH4 + 2O2 -> CO2 + 2H2O}'
    });
  });

  test('Case 5: Chemical Engineering Units with \\mathrm{}', () => {
    const input = 'The density is $1000\\,\\mathrm{kg\\,m^{-3}}$ and specific heat is $4184\\,\\mathrm{J\\,mol^{-1}\\,K^{-1}}$.';
    const segments = parseMathSegments(input);
    const mathSegments = segments.filter(s => s.type === 'inline-math');
    expect(mathSegments.length).toBe(2);
    expect(mathSegments[0].content).toContain('\\mathrm{kg\\,m^{-3}}');
    expect(mathSegments[1].content).toContain('\\mathrm{J\\,mol^{-1}\\,K^{-1}}');
  });

  test('Case 6: Mixed text and inline math with rupee currency safety', () => {
    const input = 'The course costs ₹499 or $10.00 while equation is $x^2 + y^2 = r^2$.';
    const segments = parseMathSegments(input);
    // Ensure rupee sign does not break parsing
    expect(segments.some(s => s.type === 'text' && s.content.includes('₹499'))).toBe(true);
    expect(segments.some(s => s.type === 'inline-math' && s.content === 'x^2 + y^2 = r^2')).toBe(true);
  });

  test('Case 7: Unclosed or invalid math delimiter safety', () => {
    const input = 'This has an unclosed $math tag without closing delimiter.';
    const segments = parseMathSegments(input);
    // Does not crash; text is handled safely
    expect(segments.length).toBeGreaterThanOrEqual(1);
  });
});
