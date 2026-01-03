describe('Test Environment Setup', () => {
  test('Jest should be configured correctly', () => {
    expect(1 + 1).toBe(2);
  });

  test('ES modules should work', () => {
    const testObj = { default: 'test' };
    expect(testObj.default).toBe('test');
  });
});