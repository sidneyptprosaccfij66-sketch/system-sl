import { createRoot } from 'react-dom/client';
import './ui/theme/tokens.css';
import './ui/theme/base.css';
import './ui/theme/rank.css';
import './ui/theme/gate.css';
import './ui/theme/screens.css';
import './ui/theme/holo2.css';
import { Root } from './ui/shell/Root';

document.documentElement.classList.add('holo2');
createRoot(document.getElementById('root')!).render(<Root />);
