import { message, Modal } from 'antd';
import type { ModalFuncProps } from 'antd/lib/modal';

export const showSuccess = (content: string): void => {
  message.success(content);
};

export const showError = (content: string): void => {
  message.error(content);
};

export const showWarning = (content: string): void => {
  message.warning(content);
};

export const showInfo = (content: string): void => {
  message.info(content);
};

export const confirm = (options: Omit<ModalFuncProps, 'open'>): Promise<boolean> => {
  return new Promise((resolve) => {
    Modal.confirm({
      ...options,
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
};

export const showModal = (options: Omit<ModalFuncProps, 'open'>): void => {
  Modal.info(options);
};

export const showLoading = (): ReturnType<typeof message.loading> => {
  return message.loading('加载中...', 0);
};

export const hideLoading = (hide: ReturnType<typeof message.loading>): void => {
  hide();
};
