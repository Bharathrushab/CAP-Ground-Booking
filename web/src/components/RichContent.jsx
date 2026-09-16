import { Fragment } from 'react';
import { safeUrl, bodyText } from '../lib/content';

export const headingId = (index) => `section-${index}`;

function renderNode(node, key) {
  const children = node.content?.map((child, index) => renderNode(child, `${key}-${index}`));
  if (node.type === 'text') {
    let text = node.text;
    for (const mark of node.marks || []) {
      if (mark.type === 'bold') text = <strong>{text}</strong>;
      if (mark.type === 'italic') text = <em>{text}</em>;
      if (mark.type === 'underline') text = <u>{text}</u>;
      if (mark.type === 'strike') text = <s>{text}</s>;
      if (mark.type === 'code') text = <code>{text}</code>;
      if (mark.type === 'link' && safeUrl(mark.attrs?.href)) text = <a href={safeUrl(mark.attrs.href)} target="_blank" rel="noopener noreferrer">{text}</a>;
    }
    return <Fragment key={key}>{text}</Fragment>;
  }
  if (node.type === 'heading') {
    const Tag = `h${Math.max(2, Math.min(4, node.attrs?.level || 2))}`;
    return <Tag id={headingId(key)} key={key}>{children}</Tag>;
  }
  const tags = { doc: 'div', paragraph: 'p', bulletList: 'ul', orderedList: 'ol', listItem: 'li', blockquote: 'blockquote', tableRow: 'tr', tableCell: 'td', tableHeader: 'th' };
  if (node.type === 'table') return <div className="table-scroll" key={key}><table><tbody>{children}</tbody></table></div>;
  if (node.type === 'hardBreak') return <br key={key} />;
  if (node.type === 'horizontalRule') return <hr key={key} />;
  const Tag = tags[node.type];
  if (!Tag) return null;
  return <Tag key={key} {...(['tableCell', 'tableHeader'].includes(node.type) ? { colSpan: node.attrs?.colspan, rowSpan: node.attrs?.rowspan } : {})} {...(node.type === 'blockquote' ? { 'data-tone': node.attrs?.tone || 'info' } : {})}>{children}</Tag>;
}

export function Contents({ body }) {
  const headings = (body?.content || []).map((node, index) => ({ node, index })).filter(({ node }) => node.type === 'heading' && node.attrs?.level === 2);
  if (!headings.length) return null;
  return <nav className="contents" aria-label="On this page"><h2>On this page</h2>{headings.map(({ node, index }) => <a href={`#${headingId(index)}`} key={index}>{bodyText(node)}</a>)}</nav>;
}

export default function RichContent({ body }) {
  return <div className="prose">{body?.content?.map((node, index) => renderNode(node, index))}</div>;
}