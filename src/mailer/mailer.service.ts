import { Injectable } from '@nestjs/common';

import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';
import { Personalization } from 'mailersend/lib/modules/Email.module';

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

const sentFrom = new Sender(
  'test@trial-x2p0347j5yk4zdrn.mlsender.net',
  'Time Fans',
);

@Injectable()
export class MailerService {
  async sendMail(
    email: string,
    name: string,
    subject: string,
    templateId: string,
    data: Personalization[],
  ) {
    const recipients = [new Recipient(email, name)];
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setReplyTo(sentFrom)
      .setTemplateId(templateId)
      .setPersonalization(data);
    mailersend.email.send(emailParams);
  }
}
