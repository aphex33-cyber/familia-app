/**
 * DailyVerseModal — Popup con versículo bíblico Reina-Valera 1960
 * Se muestra una vez por sesión, justo después de iniciar sesión con PIN.
 * Mismo versículo para toda la familia cada día (basado en día del año).
 *
 * Usa ReactDOM.createPortal para montarse directamente en document.body,
 * garantizando centrado perfecto sin importar el layout o transforms del padre.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const VERSES = [
  { ref: 'Josué 24:15',       text: '…Pero yo y mi casa serviremos a Jehová.' },
  { ref: 'Proverbios 22:6',   text: 'Instruye al niño en su camino, y aun cuando fuere viejo no se apartará de él.' },
  { ref: 'Salmos 127:3',      text: 'He aquí, herencia de Jehová son los hijos; cosa de estima el fruto del vientre.' },
  { ref: '1 Corintios 13:4',  text: 'El amor es sufrido, es benigno; el amor no tiene envidia, el amor no es jactancioso, no se envanece.' },
  { ref: 'Efesios 6:1',       text: 'Hijos, obedeced en el Señor a vuestros padres, porque esto es justo.' },
  { ref: 'Efesios 4:32',      text: 'Sed más bien amables unos con otros, misericordiosos, perdonándoos unos a otros, como Dios también os perdonó a vosotros en Cristo.' },
  { ref: 'Colosenses 3:13',   text: 'Soportándoos unos a otros, y perdonándoos unos a otros si alguno tuviere queja contra otro. De la manera que Cristo os perdonó, así también hacedlo vosotros.' },
  { ref: 'Salmos 34:18',      text: 'Cercano está Jehová a los quebrantados de corazón; y salva a los contritos de espíritu.' },
  { ref: 'Filipenses 4:13',   text: 'Todo lo puedo en Cristo que me fortalece.' },
  { ref: 'Isaías 41:10',      text: 'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo.' },
  { ref: 'Proverbios 17:17',  text: 'En todo tiempo ama el amigo, y es como un hermano en tiempo de angustia.' },
  { ref: 'Salmos 23:1',       text: 'Jehová es mi pastor; nada me faltará.' },
  { ref: 'Romanos 8:28',      text: 'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.' },
  { ref: 'Mateo 6:33',        text: 'Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.' },
  { ref: 'Jeremías 29:11',    text: 'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal.' },
  { ref: 'Proverbios 31:28',  text: 'Se levantan sus hijos y la llaman bienaventurada; y su marido también la alaba.' },
  { ref: 'Salmos 91:11',      text: 'Pues a sus ángeles mandará acerca de ti, que te guarden en todos tus caminos.' },
  { ref: 'Gálatas 6:2',       text: 'Sobrellevad los unos las cargas de los otros, y cumplid así la ley de Cristo.' },
  { ref: '1 Juan 4:7',        text: 'Amados, amémonos unos a otros; porque el amor es de Dios.' },
  { ref: 'Deuteronomio 6:6-7',text: 'Y estas palabras que yo te mando hoy, estarán sobre tu corazón; y las repetirás a tus hijos.' },
  { ref: 'Salmos 128:3',      text: 'Tu mujer será como vid que lleva fruto a los lados de tu casa; tus hijos como plantas de olivo alrededor de tu mesa.' },
  { ref: 'Filipenses 4:6',    text: 'Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.' },
  { ref: 'Proverbios 3:5-6',  text: 'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.' },
  { ref: 'Salmos 46:1',       text: 'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.' },
  { ref: 'Éxodo 20:12',       text: 'Honra a tu padre y a tu madre, para que tus días se alarguen en la tierra.' },
  { ref: '2 Timoteo 1:7',     text: 'Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.' },
  { ref: 'Mateo 18:20',       text: 'Porque donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos.' },
  { ref: 'Proverbios 13:24',  text: 'El que detiene el castigo, a su hijo aborrece; mas el que lo ama, desde temprano lo corrige.' },
  { ref: 'Efesios 6:4',       text: 'Y vosotros, padres, no provoquéis a ira a vuestros hijos, sino criadlos en disciplina y amonestación del Señor.' },
  { ref: 'Salmos 119:105',    text: 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.' },
  { ref: 'Lamentaciones 3:23',text: 'Nuevas son cada mañana; grande es tu fidelidad.' },
  { ref: 'Isaías 40:31',      text: 'Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas.' },
  { ref: 'Romanos 15:13',     text: 'Y el Dios de esperanza os llene de todo gozo y paz en el creer.' },
  { ref: 'Proverbios 24:3',   text: 'Con sabiduría se edificará la casa, y con prudencia se afirmará.' },
  { ref: 'Mateo 5:9',         text: 'Bienaventurados los pacificadores, porque ellos serán llamados hijos de Dios.' },
];

function getDailyVerse() {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return VERSES[dayOfYear % VERSES.length];
}

interface DailyVerseModalProps {
  memberName: string;
  onClose: () => void;
}

export default function DailyVerseModal({ memberName, onClose }: DailyVerseModalProps) {
  const verse = getDailyVerse();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Bloquea el scroll del body mientras el modal está abierto
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => setVisible(true), 50);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  // Portal: se monta en document.body para escapar de cualquier stacking context del padre
  return createPortal(
    <div
      className={`verse-modal-overlay${visible ? ' visible' : ''}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Versículo del día"
    >
      <div
        className={`verse-modal-content${visible ? ' visible' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="verse-modal-glow" />
        <div className="verse-modal-icon">✝️</div>
        <p className="verse-modal-greeting">
          Bienvenido(a), <strong>{memberName}</strong>
        </p>
        <div className="verse-modal-divider" />
        <blockquote className="verse-modal-text">
          "{verse.text}"
        </blockquote>
        <cite className="verse-modal-ref">— {verse.ref} · RVR 1960</cite>
        <button className="verse-modal-btn" onClick={handleClose} autoFocus>
          🙏 Amén — Continuar
        </button>
      </div>
    </div>,
    document.body
  );
}
