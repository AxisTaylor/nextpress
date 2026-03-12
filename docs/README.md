<!--
title: "@axistaylor/nextpress"
description: "A comprehensive toolkit for rendering WordPress Gutenberg content 1:1 in Next.js applications."
author: "AxisTaylor, LLC"
keywords: "NextPress, Next.js, WordPress, Gutenberg, WPGraphQL, headless CMS, content rendering"
-->

<p align="center">
  <img src="../logo.svg" alt="@axistaylor/nextpress" width="120" />
</p>

# @axistaylor/nextpress

A comprehensive toolkit for rendering WordPress Gutenberg content 1:1 in Next.js applications.

## Table of Contents

### Guides
- [Getting Started](./getting-started.md) - Installation, setup, and your first WordPress page
- [Multi-WordPress Setup](./multi-wordpress.md) - Connect to multiple WordPress backends
- [WordPress Plugin](./wordpress-plugin.md) - Companion plugin for enhanced functionality
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions

### API Reference
- [API Overview](./api/README.md) - Complete API reference
- [Content](./api/content.md) - Render WordPress HTML content with custom parsers
- [HeadScripts](./api/head-scripts.md) - Load WordPress header scripts with dependency resolution
- [BodyScripts](./api/body-scripts.md) - Load WordPress footer scripts
- [Stylesheets](./api/stylesheets.md) - Load WordPress stylesheets with inline styles
- [withWCR](./api/with-wcr.md) - Next.js configuration wrapper
- [proxyByWCR](./api/proxy-by-wcr.md) - Middleware proxy for WordPress APIs

## Quick Links

- [npm package](https://www.npmjs.com/package/@axistaylor/nextpress)
- [GitHub repository](https://github.com/axistaylor/nextpress)
- [WordPress plugin](./wordpress-plugin.md)

## Introduction

NextPress bridges the gap between WordPress and Next.js, enabling you to render Gutenberg content with pixel-perfect accuracy in your React applications. It handles the complexities of WordPress scripts, styles, and block markup so you can focus on building your application.

### Key Features

- **1:1 Content Rendering**: Render WordPress Gutenberg blocks exactly as they appear on your WordPress site
- **Script Management**: Load WordPress scripts with proper dependency resolution
- **Style Handling**: Include WordPress stylesheets and inline styles seamlessly
- **Multi-site Support**: Connect to multiple WordPress backends from a single Next.js application
- **WordPress Plugin**: Companion plugin for enhanced functionality

### How It Works

NextPress provides a set of React components and Next.js utilities that work together to fetch and render WordPress content:

1. **Content Component**: Parses and renders WordPress HTML content with custom element handling
2. **HeadScripts/BodyScripts**: Manage WordPress JavaScript files with correct load order
3. **Stylesheets**: Include WordPress CSS with inline style support
4. **withWCR**: Next.js configuration wrapper for seamless integration
5. **proxyByWCR**: Middleware proxy for secure WordPress API communication

Get started by following the [Getting Started guide](./getting-started.md).
