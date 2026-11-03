// Holographic redesign prototype: the real app on demo data with the HOLO 2 visual layer on top.
import { createRoot } from 'react-dom/client';
import '../src/ui/theme/tokens.css';
import '../src/ui/theme/base.css';
import '../src/ui/theme/rank.css';
import '../src/ui/theme/gate.css';
import '../src/ui/theme/screens.css';
import '../src/ui/theme/holo2.css';
import { Root } from '../src/ui/shell/Root';

document.documentElement.classList.add('holo2');
document.body.style.margin = '0';
createRoot(document.getElementById('root')!).render(<Root forceDemo />);
