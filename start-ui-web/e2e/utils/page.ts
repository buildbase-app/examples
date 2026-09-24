// Modified from BearStudio/start-ui-web: the login helper typed the email
// one-time code, which BuildBase's hosted page replaced.
import { Page } from '@playwright/test';
import { CustomFixture } from 'e2e/utils/types';

import { FileRouteTypes } from '@/routeTree.gen';

interface PageUtils {
  /**
   * Override of the `page.goto` method with typed routes from the app
   */
  to: (
    url: FileRouteTypes['to'],
    options?: Parameters<Page['goto']>[1]
  ) => ReturnType<Page['goto']>;
}

export type ExtendedPage = { page: PageUtils };

export const pageWithUtils: CustomFixture<Page & PageUtils> = async (
  { page },
  apply
) => {
  page.to = async function to(url, options) {
    const response = await page.goto(url, options);
    // The app is server-rendered: the HTML is complete before React hydrates,
    // so a click could hit the browser's native behavior instead of a React
    // handler. Wait until React has attached itself to the DOM before going on.
    await page.waitForFunction(() =>
      Object.keys(document.documentElement).some((key) =>
        key.startsWith('__reactFiber$')
      )
    );
    return response;
  };

  await apply(page);
};
