import { Service } from "../common";

export class TelegramService extends Service {
  sendMessage(text: string): void | undefined {
    if (!this.ctx.simulation.telegramChatId || !this.ctx.simulation.telegramBotId) {
      return;
    }
    const params = new URLSearchParams({
      chat_id: this.ctx.simulation.telegramChatId,
      text: text,
      disable_web_page_preview: "true"
    });
    const url = `https://api.telegram.org/bot${this.ctx.simulation.telegramBotId}/sendMessage?` + params;
    fetch(url);
  }
}
