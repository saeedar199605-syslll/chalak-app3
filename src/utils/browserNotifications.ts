/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClickUrl?: string;
}

class BrowserNotificationManager {
  private permission: NotificationPermission = 'default';

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermissionStatus(): NotificationPermission {
    if (this.isSupported()) {
      this.permission = Notification.permission;
    }
    return this.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Browser Notifications are not supported in this environment.');
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return false;
    }
  }

  public send(payload: NotificationPayload): boolean {
    if (!this.isSupported() || this.permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/logo.svg',
        tag: payload.tag || 'chalak-eval-alert',
        dir: 'rtl',
        lang: 'fa',
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => {
        try {
          notification.close();
        } catch {}
      }, 7000);

      return true;
    } catch (e) {
      console.error('Error triggering notification:', e);
      return false;
    }
  }

  public sendWorkflowDeadlineAlert(role: string, count: number, deadlineText?: string) {
    if (count <= 0) return;
    if (role === 'supervisor') {
      this.send({
        title: 'هشدار موعد ارزیابی پرسنل',
        body: `تعداد ${count} فرم ارزیابی در انتظار تایید سرپرست است. موعد: ${deadlineText || 'پایان هفته جاری'}.`,
        tag: 'supervisor-pending-tasks'
      });
    } else if (role === 'employee') {
      this.send({
        title: 'یادآوری تکمیل خودارزیابی',
        body: 'فرم خودارزیابی دوره جاری منتظر ثبت نمرات شما است.',
        tag: 'employee-self-eval'
      });
    } else if (role === 'admin') {
      this.send({
        title: 'یادآوری کمیته کالیبراسیون',
        body: `تعداد ${count} ارزیابی آماده طرح در جلسه کالیبراسیون و تایید نهایی است.`,
        tag: 'hr-calibration-alert'
      });
    }
  }
}

export const browserNotifications = new BrowserNotificationManager();
