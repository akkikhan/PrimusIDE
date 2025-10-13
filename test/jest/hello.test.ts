import { helloWorld } from '../../src/hello';

describe('helloWorld', () => {
  it('returns the default greeting', () => {
    expect(helloWorld()).toBe('Hello, World');
  });
});
