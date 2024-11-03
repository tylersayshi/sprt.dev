/**
 * Response for when the request is not from a curl request
 *
 * @param {string} text - Raw text output for the response with the ascii table
 * @param {string} cityName - The name of the city associated with the response.
 * @return The HTML element representing the response view.
 */
export const responseView = (text: string, cityName: string) => {
  return (
    <html lang="en">
      <head>
        <title>Sports Schedule: {cityName}</title>
        <link rel="stylesheet" href="/public/stylesheets/style.css" />
        <link
          rel="apple-touch-icon"
          sizes="76x76"
          href="/public/images/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/public/images/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/public/images/favicon/favicon-16x16.png"
        />
        <link rel="manifest" href="/public/images/favicon/site.webmanifest" />
        <link rel="shortcut icon" href="/public/images/favicon/favicon.ico" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta
          name="msapplication-config"
          content="/public/images/favicon/browserconfig.xml"
        />
        <meta name="theme-color" content="#ffffff" />
        <script async defer src="https://buttons.github.io/buttons.js" />
        <link href="/public/stylesheets/font.css" rel="stylesheet" />
      </head>
      <body>
        <pre>{text}</pre>
        <a
          class="github-button"
          href="https://github.com/tylerlaws0n/sprt.dev"
          data-color-scheme="no-preference: dark; light: light; dark: dark;"
          data-icon="octicon-star"
          data-show-count="true"
          aria-label="Star tylerlaws0n/sprt.dev on GitHub"
        >
          Star
        </a>
      </body>
    </html>
  );
};
