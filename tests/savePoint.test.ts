import { canSaveAtLocation } from '../src/systems/savePoint';

describe('Save Point Rules', () => {
  it('should allow saving in auto-save town without token', () => {
    const result = canSaveAtLocation('bit-town', false, false);

    expect(result.canSave).toBe(true);
    expect(result.requiresToken).toBe(false);
  });

  it('should allow saving at explicit save point without token', () => {
    const result = canSaveAtLocation('memory-forest-entrance', false, false);

    expect(result.canSave).toBe(true);
    expect(result.requiresToken).toBe(false);
  });

  it('should require token at non-save locations', () => {
    const result = canSaveAtLocation('memory-forest', false, false);

    expect(result.canSave).toBe(false);
    expect(result.requiresToken).toBe(false);
  });
});
