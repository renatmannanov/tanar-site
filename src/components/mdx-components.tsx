import Placeholder from '@/components/Placeholder';
import type { MDXComponents } from 'mdx/types';

export const mdxComponents: MDXComponents = {
  h1: (props) => <h1 className="font-display text-4xl mt-12 mb-6" {...props} />,
  h2: (props) => <h2 className="font-display text-3xl mt-10 mb-4" {...props} />,
  h3: (props) => <h3 className="font-display text-2xl mt-8 mb-3" {...props} />,
  p: (props) => <p className="text-lg leading-relaxed mb-5 text-stone-700" {...props} />,
  a: (props) => <a className="underline decoration-stone-400 underline-offset-4 hover:decoration-stone-900" {...props} />,
  ul: (props) => <ul className="list-disc pl-6 mb-5 space-y-2" {...props} />,
  ol: (props) => <ol className="list-decimal pl-6 mb-5 space-y-2" {...props} />,
  li: (props) => <li className="text-lg leading-relaxed text-stone-700" {...props} />,
  blockquote: (props) => <blockquote className="border-l-4 border-stone-300 pl-6 my-8 italic text-stone-600" {...props} />,
  img: ({ alt }) => <Placeholder aspect="landscape" label={alt || 'image'} className="my-8" />,
};
