import { readFileSync } from 'node:fs';

export default {
  plugins: [
    {
      name: 'sections',
      transformIndexHtml: (html) =>
        html.replace(/<!-- section ([\w-]+) -->/g, (_marker, id) =>
          readFileSync(`sections/${id}/index.html`, 'utf8'),
        ),
    },
  ],
};
