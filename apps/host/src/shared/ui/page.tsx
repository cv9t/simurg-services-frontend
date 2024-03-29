import { type FC, type PropsWithChildren } from 'react';
import { useTitle } from '~/shared/lib/dom';

type PageProps = PropsWithChildren<{ title: string }>;

export const Page: FC<PageProps> = ({ title, children }) => {
  useTitle(title);

  return children;
};
