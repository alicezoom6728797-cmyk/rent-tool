import { Modal, Progress, Button } from 'antd';
import { useAppStore } from '../stores/appStore';

export default function LoadingProgress() {
  const loadingProgress = useAppStore((s) => s.loadingProgress);
  const cancelLoading = useAppStore((s) => s.cancelLoading);

  if (!loadingProgress) return null;

  const percent = Math.round((loadingProgress.current / loadingProgress.total) * 100);

  return (
    <Modal
      open={true}
      closable={false}
      footer={null}
      width={400}
      centered
    >
      <div style={{ padding: '20px 0' }}>
        <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>
          正在加载线路数据...
        </div>
        <Progress percent={percent} status="active" />
        <div style={{ marginTop: 12, color: '#999', fontSize: 13 }}>
          已加载 {loadingProgress.current} / {loadingProgress.total} 条线路
        </div>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button onClick={cancelLoading}>取消加载</Button>
        </div>
      </div>
    </Modal>
  );
}
