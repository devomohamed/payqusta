jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const nodemailer = require('nodemailer');
const emailService = require('../../src/services/EmailService');

describe('EmailService', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_PORT;
    delete process.env.EMAIL_SECURE;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_FROM;

    nodemailer.createTransport.mockReset();
    emailService.transporter = null;
    emailService.initialized = false;
    emailService.lastInitError = null;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('throws when the email service is not configured', async () => {
    await expect(emailService.sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'World',
    })).rejects.toThrow('Email service not configured');
  });

  it('throws the smtp auth error when transporter verification fails', async () => {
    process.env.EMAIL_HOST = 'smtp.gmail.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'user@gmail.com';
    process.env.EMAIL_PASS = 'bad-password';

    nodemailer.createTransport.mockReturnValue({
      verify: jest.fn().mockRejectedValue(new Error('Invalid login: 535 BadCredentials')),
    });

    await expect(emailService.sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'World',
    })).rejects.toThrow('Invalid login: 535 BadCredentials');
  });

  it('normalizes spaced gmail app passwords before sending', async () => {
    process.env.EMAIL_HOST = 'smtp.gmail.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'user@gmail.com';
    process.env.EMAIL_PASS = 'ab cd ef gh ij kl mn op';

    nodemailer.createTransport.mockReturnValue({
      verify: jest.fn().mockResolvedValue(true),
      sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
    });

    await expect(emailService.sendEmail({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'World',
    })).resolves.toEqual({ success: true, messageId: 'msg-1' });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      auth: expect.objectContaining({
        pass: 'abcdefghijklmnop',
      }),
    }));
  });
});
