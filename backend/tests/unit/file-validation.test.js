const {
  isAllowedImageMimeType,
  isAllowedBase64DocumentMimeType,
  isAllowedImportFile,
  isAllowedJsonFile,
} = require('../../src/utils/fileValidation');

describe('fileValidation', () => {
  it('accepts only safe image upload mime types', () => {
    expect(isAllowedImageMimeType('image/jpeg')).toBe(true);
    expect(isAllowedImageMimeType('image/png')).toBe(true);
    expect(isAllowedImageMimeType('image/webp')).toBe(true);
    expect(isAllowedImageMimeType('image/svg+xml')).toBe(false);
    expect(isAllowedImageMimeType('image/gif')).toBe(false);
  });

  it('accepts only safe base64 document mime types', () => {
    expect(isAllowedBase64DocumentMimeType('application/pdf')).toBe(true);
    expect(isAllowedBase64DocumentMimeType('image/png')).toBe(true);
    expect(isAllowedBase64DocumentMimeType('image/svg+xml')).toBe(false);
  });

  it('validates import files by extension and mime type', () => {
    expect(isAllowedImportFile({ originalname: 'products.csv', mimetype: 'text/csv' })).toBe(true);
    expect(isAllowedImportFile({ originalname: 'products.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })).toBe(true);
    expect(isAllowedImportFile({ originalname: 'products.xls', mimetype: '' })).toBe(true);
    expect(isAllowedImportFile({ originalname: 'products.csv', mimetype: 'application/json' })).toBe(false);
    expect(isAllowedImportFile({ originalname: 'payload.exe', mimetype: 'application/octet-stream' })).toBe(false);
  });

  it('validates backup json files by extension and mime type', () => {
    expect(isAllowedJsonFile({ originalname: 'backup.json', mimetype: 'application/json' })).toBe(true);
    expect(isAllowedJsonFile({ originalname: 'backup.json', mimetype: '' })).toBe(true);
    expect(isAllowedJsonFile({ originalname: 'backup.csv', mimetype: 'text/csv' })).toBe(false);
    expect(isAllowedJsonFile({ originalname: 'backup.json', mimetype: 'image/png' })).toBe(false);
  });
});
