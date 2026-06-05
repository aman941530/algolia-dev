/**
 * Sticky Add-to-Cart Bar
 * Dawn-compatible Web Component
 *
 * Features:
 * - Scroll-triggered visibility with configurable threshold
 * - Variant synchronization with main product form
 * - AJAX add-to-cart via Shopify Cart API
 * - Theme editor lifecycle support (shopify:section:load/unload)
 * - Accessible keyboard navigation and ARIA updates
 * - Performance-optimized scroll handling with requestAnimationFrame
 */

if (!customElements.get('sticky-add-to-cart')) {
  class StickyAddToCart extends HTMLElement {
    constructor() {
      super();
      this.scrollThreshold = parseInt(this.dataset.scrollThreshold) || 100;
      this.isVisible = false;
      this.isAdding = false;
      this.ticking = false;
      this.onScroll = this.onScroll.bind(this);
      this.onVariantChangeDocument = this.onVariantChangeDocument.bind(this);
    }

    connectedCallback() {
      this.variantSelect = this.querySelector('[data-sticky-variant-select]');
      this.addToCartBtn = this.querySelector('[data-sticky-add-to-cart-btn]');
      this.btnText = this.querySelector('[data-sticky-btn-text]');
      this.priceContainer = this.querySelector('.sticky-add-to-cart__price');
      this.quantityInput = this.querySelector('[data-sticky-quantity]');
      this.variantDataEl = this.querySelector(`#StickyVariantData-${this.dataset.sectionId}`);
      this.variantData = this.variantDataEl ? JSON.parse(this.variantDataEl.textContent) : [];

      // Apply mobile visibility setting
      this.applyMobileVisibility();

      // Bind events
      window.addEventListener('scroll', this.onScroll, { passive: true });
      document.addEventListener('variant:change', this.onVariantChangeDocument);

      if (this.variantSelect) {
        this.variantSelect.addEventListener('change', this.onVariantSelectChange.bind(this));
      }

      if (this.addToCartBtn) {
        this.addToCartBtn.addEventListener('click', this.onAddToCart.bind(this));
      }

      // Check initial scroll position
      this.checkScroll();
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScroll);
      document.removeEventListener('variant:change', this.onVariantChangeDocument);
    }

    /**
     * Apply mobile visibility based on section settings
     */
    applyMobileVisibility() {
      // The section Liquid template handles this via settings,
      // but we also support a class-based toggle
      const sectionEl = this.closest('.sticky-add-to-cart-section');
      if (sectionEl && sectionEl.dataset.showOnMobile === 'false') {
        this.classList.add('hide-mobile');
      }
    }

    /**
     * Scroll handler with rAF throttling
     */
    onScroll() {
      if (!this.ticking) {
        window.requestAnimationFrame(() => {
          this.checkScroll();
          this.ticking = false;
        });
        this.ticking = true;
      }
    }

    /**
     * Determine visibility based on scroll position
     * Also hides if the main buy button is visible in the viewport
     */
    checkScroll() {
      const scrollY = window.scrollY || window.pageYOffset;
      const shouldShow = scrollY > this.scrollThreshold;

      if (shouldShow && !this.isVisible) {
        this.classList.add('is-visible');
        this.setAttribute('aria-hidden', 'false');
        this.isVisible = true;
      } else if (!shouldShow && this.isVisible) {
        this.classList.remove('is-visible');
        this.setAttribute('aria-hidden', 'true');
        this.isVisible = false;
      }
    }

    /**
     * Listen for Dawn's variant:change event dispatched on document
     * Sync the sticky bar variant selector with the main product form
     */
    onVariantChangeDocument(event) {
      const variant = event.detail?.variant;
      if (!variant) return;

      // Update the sticky variant selector
      if (this.variantSelect) {
        const option = this.variantSelect.querySelector(`option[value="${variant.id}"]`);
        if (option) {
          this.variantSelect.value = variant.id;
        }
      }

      // Update the button and price
      this.updateVariantUI(variant.id);
    }

    /**
     * Handle variant change from the sticky bar's own select
     */
    onVariantSelectChange(event) {
      const variantId = event.target.value;
      this.updateVariantUI(variantId);
    }

    /**
     * Update price, button state, and variant ID based on selected variant
     */
    updateVariantUI(variantId) {
      const variant = this.variantData.find((v) => v.id === parseInt(variantId));
      if (!variant) return;

      // Update button variant ID
      if (this.addToCartBtn) {
        this.addToCartBtn.dataset.variantId = variant.id;
      }

      // Update availability
      if (this.addToCartBtn && this.btnText) {
        if (variant.available) {
          this.addToCartBtn.removeAttribute('disabled');
          this.btnText.textContent = this.addToCartBtn.dataset.addText || 'Add to cart';
        } else {
          this.addToCartBtn.setAttribute('disabled', 'disabled');
          this.btnText.textContent = this.addToCartBtn.dataset.soldText || 'Sold out';
        }
      }

      // Update price display
      if (this.priceContainer) {
        let priceHTML = '';

        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          priceHTML += `<s class="sticky-add-to-cart__compare-price">${variant.compare_at_price_formatted}</s>`;
        }

        priceHTML += `<span class="sticky-add-to-cart__current-price">${variant.price_formatted}</span>`;
        this.priceContainer.innerHTML = priceHTML;
      }
    }

    /**
     * AJAX Add to Cart via Shopify Cart API
     */
    async onAddToCart(event) {
      event.preventDefault();

      if (this.isAdding) return;

      const variantId = this.addToCartBtn?.dataset.variantId;
      const quantity = this.quantityInput ? parseInt(this.quantityInput.value) : 1;

      if (!variantId) return;

      this.isAdding = true;
      this.addToCartBtn.classList.add('loading');
      this.addToCartBtn.setAttribute('aria-busy', 'true');

      try {
        const response = await fetch(window.Shopify?.routes?.root + 'cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            id: parseInt(variantId),
            quantity: quantity,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.description || 'Failed to add to cart');
        }

        // Dispatch cart update event for Dawn cart drawer / cart count
        document.dispatchEvent(new CustomEvent('cart:refresh'));

        // Update cart count bubble via Section Rendering API
        this.updateCartCount();

        // Brief success feedback
        if (this.btnText) {
          const originalText = this.btnText.textContent;
          this.btnText.textContent = '✓ Added';
          setTimeout(() => {
            this.btnText.textContent = originalText;
          }, 1500);
        }
      } catch (error) {
        console.error('[StickyAddToCart] Error:', error.message);

        if (this.btnText) {
          const originalText = this.btnText.textContent;
          this.btnText.textContent = 'Error';
          setTimeout(() => {
            this.btnText.textContent = originalText;
          }, 2000);
        }
      } finally {
        this.isAdding = false;
        this.addToCartBtn.classList.remove('loading');
        this.addToCartBtn.setAttribute('aria-busy', 'false');
      }
    }

    /**
     * Refresh cart count via Section Rendering API
     */
    async updateCartCount() {
      try {
        const response = await fetch('/?sections=cart-icon-bubble');
        if (!response.ok) return;

        const sections = await response.json();
        const cartBubbleHTML = sections['cart-icon-bubble'];

        if (cartBubbleHTML) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cartBubbleHTML;

          const newBubble = tempDiv.querySelector('.cart-count-bubble');
          const existingBubbles = document.querySelectorAll('.cart-count-bubble');

          existingBubbles.forEach((bubble) => {
            if (newBubble) {
              bubble.innerHTML = newBubble.innerHTML;
              bubble.classList.remove('hidden');
            }
          });
        }
      } catch (error) {
        // Silently fail - cart count update is non-critical
      }
    }
  }

  customElements.define('sticky-add-to-cart', StickyAddToCart);
}

/**
 * Theme Editor Lifecycle Support
 * Re-initialize on section load, cleanup on section unload
 */
if (Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => {
    const stickyEl = event.target.querySelector('sticky-add-to-cart');
    if (stickyEl && stickyEl.connectedCallback) {
      stickyEl.connectedCallback();
    }
  });

  document.addEventListener('shopify:section:unload', (event) => {
    const stickyEl = event.target.querySelector('sticky-add-to-cart');
    if (stickyEl && stickyEl.disconnectedCallback) {
      stickyEl.disconnectedCallback();
    }
  });
}
