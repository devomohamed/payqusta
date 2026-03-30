/**
 * PayQusta v3 — i18n Content Dictionary
 * Contains all strings for Arabic (default) and English
 */

export const content = {
  ar: {
    dir: 'rtl',
    lang: 'ar',
    nav: {
      platform: 'المنصة',
      solutions: 'الحلول',
      pricing: 'الأسعار',
      success: 'قصص النجاح',
      faq: 'الأسئلة',
      login: 'تسجيل الدخول',
      cta: 'ابدأ الآن ←',
      themeDark: 'داكن',
      themeLight: 'فاتح',
    },
    hero: {
      badge: 'جديد: تكامل مع أرامكس، مدى، وتابي',
      h1Line1: 'بِع أكثر.',
      h1Line2: 'أدِر بذكاء.',
      h1Line3: 'انمُ بثقة.',
      sub: 'منصة بيكوستا تجمع نقطة البيع الاحترافية، المتجر الإلكتروني، وإدارة المخزون في مكان واحد — دون خبرة تقنية، دون عمولات.',
      ctaPrimary: 'ابدأ مجاناً — 14 يوم ←',
      ctaSecondary: 'شاهد كيف يعمل ▶',
      stats: [
        { num: '+5000', label: 'تاجر يثق بنا', accent: 'تاجر' },
        { num: '99.9%', label: 'وقت التشغيل', accent: '%' },
        { num: '+2M', label: 'عملية ناجحة', accent: 'عملية' },
        { num: '24/7', label: 'دعم فني مباشر', accent: 'دعم' },
      ],
      mockup: {
        inventory: 'مزامنة المخزون — فورية',
        orderNotify: 'طلب جديد #4298',
        orderSub: 'تم الدفع بنجاح',
      }
    },
    trust: 'تكامل سلس مع',
    highlights: [
      { title: 'بدون عمولات', desc: 'ادفع رسوماً ثابتة فقط - مبيعاتك كلها لك' },
      { title: 'يعمل بدون إنترنت', desc: 'POS يعمل أوفلاين ويتزامن تلقائياً' },
      { title: 'آمن ومعتمد', desc: 'SSL كامل، PCI-DSS معتمد' },
      { title: 'فروع متعددة', desc: 'لوحة تحكم مركزية لجميع فروعك' },
    ],
    platform: {
      tag: 'منصة متكاملة',
      h2: 'كل ما تحتاجه لإدارة تجارتك في مكان واحد',
      sub: 'صمم بيكوستا ليكون الحل الأمثل لتجار التجزئة، المطاعم، والمتاجر الإلكترونية في السوق المصري.',
      featured: {
        title: 'نقطة بيع احترافية (POS)',
        desc: 'أسرع كاشير سحابي يعمل على أي جهاز، مع دعم كامل للفواتير والباركود.',
        checklist: ['طباعة فواتير حرارية', 'دعم قارئ الباركود', 'إدارة الورديات والموظفين'],
        tags: ['يعمل أوفلاين', 'QR Code'],
      },
      cards: [
        {
          title: 'متجر إلكتروني متكامل',
          desc: 'أنشئ متجرك الخاص بهويتك، واستقبل الطلبات مباشرة على هاتفك.',
          checklist: ['تكامل مع شركات الشحن', 'بوابات دفع متنوعة', 'تصميم متوافق مع الجوال'],
          tags: ['SEO', 'Mobile First'],
        },
        {
          title: 'إدارة المخزون الذكية',
          desc: 'راقب مستويات المخزون في جميع فروعك لحظة بلحظة مع تنبيهات عند النقص.',
          checklist: ['تنبيهات انخفاض المخزون', 'تحويلات بين الفروع', 'جرد سريع بالهاتف'],
          tags: ['Real-time', 'Multiple Locations'],
        }
      ],
      viewMore: 'عرض المزيد ▾',
      showLess: 'إخفاء',
    },
    steps: {
      h2: 'اربع خطوات لتبدأ رحلة النجاح',
      items: [
        { num: '1', title: 'أنشئ حسابك', desc: 'سجل بياناتك الأساسية' },
        { num: '2', title: 'أضف منتجاتك', desc: 'ارفاق الصور والكميات' },
        { num: '3', title: 'اختر باقتك', desc: 'بما يناسب حجم عملك' },
        { num: '4', title: 'ابدأ البيع', desc: 'عبر الكاشير أو المتجر' },
      ]
    },
    reports: {
      tag: 'تقارير ذكية',
      h2: 'بياناتك هي <span class="text-brand-gold">قوة عملك</span> القادمة',
      desc: 'احصل على رؤية شاملة لأداء متجرك، مبيعاتك، وأكثر المنتجات طلباً من خلال لوحات تحكم تفاعلية.',
      stats: [
        { label: 'إجمالي المبيعات', value: '42,500 ج.م' },
        { label: 'الطلبات النشطة', value: '128 طلب' },
        { label: 'صافي الربح', value: '12,300 ج.م' },
        { label: 'نسبة النمو', value: '+14%' },
      ],
      charts: {
        sales: 'تحليل المبيعات',
        distribution: 'توزيع القنوات',
      }
    },
    metrics: {
      tag: 'ثقتك معنا',
      h2: 'أرقام تتحدث عن نفسها',
      sub: 'نحن فخورون بدعم آلاف التجار في رحلتهم نحو التحول الرقمي.',
      items: [
        { num: '10K', span: '+', label: 'مستخدم نشط' },
        { num: '150M', span: 'ج.م', label: 'حجم العمليات' },
        { num: '4.9', span: '/5', label: 'تقييم التجار' },
        { num: '20', span: '+', label: 'محافظة مغطاة' },
      ]
    },
    paths: {
      h2: 'اختر الطريق المناسب لنموك',
      items: [
        { icon: '🛍️', title: 'تجار التجزئة', desc: 'حلول متكاملة للمحلات والمخازن', badge: 'الأكثر طلباً' },
        { icon: '🍔', title: 'المطاعم والكافيهات', desc: 'إدارة الطاولات والطلبات والمطبخ', badge: 'جديد' },
        { icon: '📦', title: 'تجارة الجملة', desc: 'إدارة الموردين والعملاء والمديونيات' },
        { icon: '📱', title: 'المتاجر الإلكترونية', desc: 'بيع عبر الويب ووسائل التواصل' },
        { icon: '🏠', title: 'الأعمال المنزلية', desc: 'حلول بسيطة لإدارة الطلبات والنمو' },
        { icon: '🛠️', title: 'مراكز الخدمة', desc: 'إدارة الحجوزات والمصاريف والموظفين' },
      ]
    },
    testimonials: {
      h2: 'تجار يشاركونك تجربتهم',
      items: [
        { name: 'محمد علي', role: 'صاحب محل فاشن', company: 'بيكوستا غيرت طريقة إدارتي للمحل تماماً، الكاشير سريع جداً.', initials: 'م.ع' },
        { name: 'أحمد محمود', role: 'مدير سوبر ماركت', company: 'إدارة المخزون والجرد أصبحت أسهل بكتير باستخدام الموبايل.', initials: 'أ.م' },
        { name: 'سارة حسن', role: 'تاجرة إلكترونية', company: 'المتجر الإلكتروني احترافي جداً وساعدني أزود مبيعاتي 40%.', initials: 'س.ح' },
      ]
    },
    pricing: {
      h2: 'باقات تناسب جميع أحجام الأعمال',
      billing: {
        monthly: 'شهري',
        yearly: 'سنوي',
        save: 'وفّر 20%',
      },
      mostPopular: 'الأكثر شيوعاً',
      plans: [
        {
          name: 'مبتدئ',
          priceMonthly: 199,
          priceAnnual: 159,
          annualTotal: 'الإجمالي السنوي: 1,908 ج.م (وفّر 477 ج.م)',
          features: ['فرع واحد', '100 منتج', 'متجر إلكتروني', 'كاشير سحابي', 'دعم فني'],
        },
        {
          name: 'نمو',
          priceMonthly: 499,
          priceAnnual: 399,
          popular: true,
          annualTotal: 'الإجمالي السنوي: 4,788 ج.م (وفّر 1,197 ج.م)',
          features: ['3 فروع', 'منتجات غير محدودة', 'تكامل شحن/دفع', 'إدارة عملاء متقدمة', 'تقارير ذكية'],
        },
        {
          name: 'مؤسسة',
          priceMonthly: 'تواصل معنا',
          priceAnnual: 'تواصل معنا',
          features: ['فروع غير محدودة', 'تخصيص كامل', 'مدير حساب مخصص', 'تكامل API', 'دعم أولوي'],
        }
      ],
      cta: 'ابدأ الآن',
      egp: 'ج.م',
    },
    faq: {
      h2: 'الأسئلة الشائعة',
      items: [
        { q: 'هل يمكنني تجربة المنصة مجاناً؟', a: 'نعم، نوفر فترة تجريبية مجانية لمدة 14 يوماً تشمل جميع المميزات.' },
        { q: 'هل أحتاج لأجهزة معينة لتشغيل الكاشير؟', a: 'لا، بيكوستا يعمل على أي جهاز متصل بالإنترنت (تابلت، موبايل، أو كمبيوتر).' },
        { q: 'هل يوجد عمولات على مبيعات المتجر؟', a: 'لا يوجد أي عمولات من بيكوستا على مبيعاتك، فقط اشتراك الباقة.' },
        { q: 'كيف يمكنني التواصل مع الدعم الفني؟', a: 'فريق الدعم متاح 24/7 عبر المحادثة المباشرة، واتساب، أو الهاتف.' },
      ]
    },
    ctaSection: {
      h2: 'جاهز لرفع <span class="text-brand-gold">كفاءة تجارتك</span> اليوم؟',
      h2Alt: 'انضم لآلاف التجار الناجحين مع بيكوستا',
      sub: 'لا بطاقة ائتمانية · إعداد في 5 دقائق · إلغاء في أي وقت',
      primary: 'ابدأ تجربتك المجانية',
      secondary: 'تواصل مع المبيعات',
      features: [
        { icon: 'Zap', text: 'إعداد في 5 دقائق' },
        { icon: 'ShieldCheck', text: 'لا بطاقة ائتمانية' },
        { icon: 'Clock', text: 'إلغاء في أي وقت' }
      ]
    },
    footer: {
      desc: 'بيكوستا هي المنصة المتكاملة لإدارة المبيعات والمخزون والتجارة الإلكترونية في الشرق الأوسط.',
      cols: [
        { title: 'المنصة', links: ['المميزات', 'الأسعار', 'المتجر الإلكتروني', 'الكاشير'] },
        { title: 'الشركة', links: ['من نحن', 'المدونة', 'الوظائف', 'اتصل بنا'] },
        { title: 'القانونية', links: ['الشروط', 'الخصوصية', 'الكوكيز'] },
      ],
      copyright: '© 2024 بيكوستا (PayQusta). جميع الحقوق محفوظة.',
      madeWith: 'صنع بكل ❤️ في مصر',
    }
  },
  en: {
    dir: 'ltr',
    lang: 'en',
    nav: {
      platform: 'Platform',
      solutions: 'Solutions',
      pricing: 'Pricing',
      success: 'Success Stories',
      faq: 'FAQ',
      login: 'Login',
      cta: 'Get Started →',
      themeDark: 'Dark',
      themeLight: 'Light',
    },
    hero: {
      badge: 'New: Aramex, Mada & Tabby integration',
      h1Line1: 'Sell More.',
      h1Line2: 'Manage Smart.',
      h1Line3: 'Grow Confidently.',
      sub: 'PayQusta unifies your POS, online store, and inventory in one place — no technical expertise, no commissions.',
      ctaPrimary: 'Start Free — 14 days →',
      ctaSecondary: 'See how it works ▶',
      stats: [
        { num: '+5000', label: 'Trusting Merchants', accent: 'Merchants' },
        { num: '99.9%', label: 'Uptime', accent: '%' },
        { num: '+2M', label: 'Successful Orders', accent: 'Orders' },
        { num: '24/7', label: 'Live Support', accent: 'Support' },
      ],
      mockup: {
        inventory: 'Inventory Sync — Instant',
        orderNotify: 'New Order #4298',
        orderSub: 'Paid successfully',
      }
    },
    trust: 'Integrated With',
    highlights: [
      { title: 'Zero Commissions', desc: 'Pay fixed fees only - all sales are yours' },
      { title: 'Offline Ready', desc: 'Cloud POS works offline & syncs auto' },
      { title: 'Secure & Certified', desc: 'SSL & PCI-DSS certified' },
      { title: 'Multi-branch', desc: 'Centralized control for all locations' },
    ],
    platform: {
      tag: 'Unified Platform',
      h2: 'Everything you need to run your business',
      sub: 'PayQusta is designed to be the ultimate solution for retailers, restaurants, and e-shops.',
      featured: {
        title: 'Professional POS',
        desc: 'Fastest cloud cashier that works on any device, with full invoice and barcode support.',
        checklist: ['Thermal invoice printing', 'Barcode scanner support', 'Shift & employee management'],
        tags: ['Offline Mode', 'QR Code'],
      },
      cards: [
        {
          title: 'Complete Online Store',
          desc: 'Create your own branded store and receive orders directly on your phone.',
          checklist: ['Shipping integrations', 'Multiple payment gateways', 'Mobile-first design'],
          tags: ['SEO', 'Mobile First'],
        },
        {
          title: 'Smart Inventory Management',
          desc: 'Monitor stock levels across all branches in real-time with low-stock alerts.',
          checklist: ['Low stock notifications', 'Inter-branch transfers', 'Quick mobile stocktake'],
          tags: ['Real-time', 'Multiple Locations'],
        }
      ],
      viewMore: 'View More ▾',
      showLess: 'Hide',
    },
    steps: {
      h2: '4 Steps to success',
      items: [
        { num: '1', title: 'Create Account', desc: 'Register basic details' },
        { num: '2', title: 'Add Products', desc: 'Upload photos & stock' },
        { num: '3', title: 'Choose Plan', desc: 'Fits your business size' },
        { num: '4', title: 'Start Selling', desc: 'Via POS or Web store' },
      ]
    },
    reports: {
      tag: 'Smart Reports',
      h2: 'Your data is your next <span class="text-brand-gold">business power</span>',
      desc: 'Get comprehensive insights into your store performance, sales, and top products through interactive dashboards.',
      stats: [
        { label: 'Total Sales', value: '42,500 EGP' },
        { label: 'Active Orders', value: '128' },
        { label: 'Net Profit', value: '12,300 EGP' },
        { label: 'Growth Rate', value: '+14%' },
      ],
      charts: {
        sales: 'Sales Analysis',
        distribution: 'Channel Distribution',
      }
    },
    metrics: {
      tag: 'Your Trust',
      h2: 'Numbers that speak for themselves',
      sub: 'We are proud to support thousands of merchants on their digital transformation journey.',
      items: [
        { num: '10K', span: '+', label: 'Active Users' },
        { num: '150M', span: 'EGP', label: 'Transaction Volume' },
        { num: '4.9', span: '/5', label: 'Merchant Reviews' },
        { num: '20', span: '+', label: 'Governorates covered' },
      ]
    },
    paths: {
      h2: 'Choose the right path for your growth',
      items: [
        { icon: '🛍️', title: 'Retailers', desc: 'Complete solutions for shops & stores', badge: 'Popular' },
        { icon: '🍔', title: 'Restaurants & Cafes', desc: 'Manage tables, orders & kitchen', badge: 'New' },
        { icon: '📦', title: 'Wholesalers', desc: 'Manage suppliers, clients & debts' },
        { icon: '📱', title: 'Online Stores', desc: 'Sell on web & social media' },
        { icon: '🏠', title: 'Home Business', desc: 'Simple solutions to manage orders' },
        { icon: '🛠️', title: 'Service Centers', desc: 'Manage bookings, expenses & staff' },
      ]
    },
    testimonials: {
      h2: 'Merchants sharing their experience',
      items: [
        { name: 'Mohamed Ali', role: 'Fashion Shop Owner', company: 'PayQusta changed how I manage my shop, the POS is very fast.', initials: 'M.A' },
        { name: 'Ahmed Mahmoud', role: 'Supermarket Manager', company: 'Inventory and stocktake became much easier using the mobile app.', initials: 'A.M' },
        { name: 'Sarah Hassan', role: 'E-commerce Seller', company: 'The online store is very professional and helped me grow sales by 40%.', initials: 'S.H' },
      ]
    },
    pricing: {
      h2: 'Plans that fit all business sizes',
      billing: {
        monthly: 'Monthly',
        yearly: 'Yearly',
        save: 'Save 20%',
      },
      mostPopular: 'Most Popular',
      plans: [
        {
          name: 'Starter',
          priceMonthly: 199,
          priceAnnual: 159,
          annualTotal: 'Annual total: 1,908 EGP (save 477 EGP)',
          features: ['1 Branch', '100 Products', 'Online Store', 'Cloud POS', 'Tech Support'],
        },
        {
          name: 'Growth',
          priceMonthly: 499,
          priceAnnual: 399,
          popular: true,
          annualTotal: 'Annual total: 4,788 EGP (save 1,197 EGP)',
          features: ['3 Branches', 'Unlimited Products', 'Shipping/Payment Sync', 'Advanced CRM', 'Smart Reports'],
        },
        {
          name: 'Enterprise',
          priceMonthly: 'Custom',
          priceAnnual: 'Custom',
          features: ['Unlimited Branches', 'Full Customization', 'Dedicated Manager', 'API Integration', 'Priority Support'],
        }
      ],
      cta: 'Start Now',
      egp: 'EGP',
    },
    faq: {
      h2: 'FAQ',
      items: [
        { q: 'Can I try for free?', a: 'Yes, we offer a 14-day free trial including all features.' },
        { q: 'Do I need specific hardware?', a: 'No, PayQusta works on any device with internet (Tablet, Mobile, or PC).' },
        { q: 'Are there sales commissions?', a: 'No commissions on your sales from PayQusta, only the plan subscription.' },
        { q: 'How can I contact support?', a: 'Support is available 24/7 via live chat, WhatsApp, or phone.' },
      ]
    },
    ctaSection: {
      h2: 'Ready to boost your <span class="text-brand-gold">business efficiency</span> today?',
      h2Alt: 'Join thousands of successful merchants with PayQusta',
      sub: 'No credit card · 5 min setup · Cancel anytime',
      primary: 'Start your free trial',
      secondary: 'Contact Sales',
      features: [
        { icon: 'Zap', text: '5 min setup' },
        { icon: 'ShieldCheck', text: 'No credit card' },
        { icon: 'Clock', text: 'Cancel anytime' }
      ]
    },
    footer: {
      desc: 'PayQusta is the unified platform for sales, inventory, and e-commerce in the Middle East.',
      cols: [
        { title: 'Platform', links: ['Features', 'Pricing', 'Web Store', 'Cashier'] },
        { title: 'Company', links: ['About Us', 'Blog', 'Careers', 'Contact'] },
        { title: 'Legal', links: ['Terms', 'Privacy', 'Cookies'] },
      ],
      copyright: '© 2024 PayQusta. All rights reserved.',
      madeWith: 'Made with ❤️ in Egypt',
    }
  }
};
