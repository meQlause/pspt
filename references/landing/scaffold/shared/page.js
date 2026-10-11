import { gsap } from 'gsap';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

export const SEAM = { line: '75%', scrub: 0.6 };

export function stitch([fromX, fromY], [toX, toY]) {
  const middle = (fromY + toY) / 2;

  return `C${fromX},${middle} ${toX},${middle} ${toX},${toY}`;
}

const roots = () => [...document.querySelectorAll('[data-section]')];
const before = (root) => roots()[roots().indexOf(root) - 1];

export const handoff = {
  exit(root, point) {
    root.dataset.exit = JSON.stringify(point);
  },
  incoming(root) {
    const giver = before(root);

    if (!giver?.dataset.exit) {
      return null;
    }

    const point = JSON.parse(giver.dataset.exit);
    const shift = giver.getBoundingClientRect().left - root.getBoundingClientRect().left;

    return { x: point.x + shift, y: point.y - giver.offsetHeight, angle: point.angle ?? 0 };
  },
  receive(root, taken) {
    before(root)?.toggleAttribute('data-handed-off', taken);
  },
};

const MEDIA = {
  desktop: '(min-width: 761px)',
  phone: '(max-width: 760px)',
  reduce: '(prefers-reduced-motion: reduce)',
};

export function start(scenes) {
  gsap.matchMedia().add(MEDIA, (context) => {
    const conditions = context.conditions;

    if (conditions.reduce) {
      return undefined;
    }

    const smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.2,
      smoothTouch: 0.1,
    });
    const page = { gsap, ScrollTrigger, smoother, conditions, stitch, SEAM, handoff };
    const cleanups = roots().map((root) => {
      root.dataset.motion = '';

      return scenes[root.dataset.section]?.(root, page);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup?.());
      roots().forEach((root) => delete root.dataset.motion);
      smoother.kill();
    };
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
