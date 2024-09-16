<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>

<xsl:template match="/">
	<html>
	<head>
		<title>XML Sitemap</title>
		<meta name="viewport" content="width=device-width, initial-scale=1"/>
		<link rel="stylesheet" type="text/css" href="main.css"/>
		<link rel="stylesheet" type="text/css" href="sitemap/sitemap.css"/>
	</head>
	<body>
		<header>
			<div id="name">NICHOLAS S SELBY</div>
			<nav>
				<input class="menu-btn" type="checkbox" id="menu-btn"/>
				<label class="menu-icon" for="menu-btn" tabindex="0"><span class="navicon"></span></label>
				<ul class="menu">
					<li><a href="index.html">HOME</a></li>
					<li><a href="about.html">ABOUT ME</a></li>
					<li><a href="selected-work.html">SELECTED WORK</a></li>
					<li><a href="blog.html">BLOG</a></li>
					<li><a href="service.html">SERVICE</a></li>
				</ul>
			</nav>
		</header>

		<main>
			<h1>XML Sitemap</h1>

			<section>
				<h2>Homepage</h2>
				<xsl:call-template name="process-priority">
					<xsl:with-param name="priority" select="'1.00'"/>
				</xsl:call-template>
			</section>

			<section>
				<h2>Main Sections</h2>
				<xsl:call-template name="process-priority">
					<xsl:with-param name="priority" select="'0.80'"/>
				</xsl:call-template>
			</section>

			<section>
				<h2>Selected Work</h2>
				<xsl:call-template name="process-priority">
					<xsl:with-param name="priority" select="'0.60'"/>
				</xsl:call-template>
			</section>

			<section>
				<h2>Blog</h2>
				<xsl:call-template name="process-priority">
					<xsl:with-param name="priority" select="'0.40'"/>
				</xsl:call-template>
			</section>

			<section>
				<h2>Supplementary Documents</h2>
				<xsl:call-template name="process-priority">
					<xsl:with-param name="priority" select="'0.20'"/>
				</xsl:call-template>
			</section>
		</main>

		<footer>
			<a rel="license" target="_blank" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png"/></a><br/>© 2018–2024 This work by <a href="https://rupumped.github.io" property="cc:attributionName" rel="cc:attributionURL">Nicholas S. Selby</a> is licensed under a <a rel="license" target="_blank" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.<br/>Feel free to fork the <a rel="external" target="_blank" href="https://github.com/rupumped/rupumped.github.io">source code</a> from GitHub and create your own website using this template.
		</footer>

	</body>
	</html>
</xsl:template>

<xsl:template name="process-priority">
	<xsl:param name="priority"/>
	<div class="url-list">
		<xsl:for-each select="/sitemap:urlset/sitemap:url[sitemap:priority = $priority]">
			<a href="{sitemap:loc}">
				<xsl:value-of select="sitemap:title"/>
			</a>
		</xsl:for-each>
	</div>
</xsl:template>

</xsl:stylesheet>