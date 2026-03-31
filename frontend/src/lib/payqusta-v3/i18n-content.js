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
      sub: 'منصة بيكوستا تجمع نقطة البيع، المتجر الإلكتروني، وإدارة المخزون في مسار تشغيل أوضح وأسهل للبدء.',
      ctaPrimary: 'ابدأ الآن ←',
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
      { title: 'خطط أوضح', desc: 'اختر الباقة المناسبة لنشاطك مع تسعير أبسط ومسار بدء أوضح' },
      { title: 'يعمل بدون إنترنت', desc: 'POS يعمل أوفلاين ويتزامن تلقائياً' },
      { title: 'تشغيل آمن', desc: 'صلاحيات واضحة وسير عمل منظم يساعدك على إدارة التشغيل بثقة' },
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
      sub: 'أمثلة توضيحية على نوع المؤشرات التي يمكن متابعتها مع نمو نشاطك.',
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
      h2: 'سيناريوهات استخدام من تجار مختلفين',
      items: [
        { name: 'محمد علي', role: 'صاحب محل فاشن', company: 'سيناريو لمتجر أزياء يحتاج سرعة أوضح في الكاشير وتنظيماً أفضل للمبيعات اليومية.', initials: 'م.ع' },
        { name: 'أحمد محمود', role: 'مدير سوبر ماركت', company: 'سيناريو لسوبر ماركت يريد متابعة المخزون والجرد من الهاتف بشكل أبسط وأسرع.', initials: 'أ.م' },
        { name: 'سارة حسن', role: 'تاجرة إلكترونية', company: 'سيناريو لتاجر إلكتروني يريد واجهة بيع أوضح ومتابعة أفضل للطلبات والقنوات.', initials: 'س.ح' },
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
        { q: 'كيف أبدأ التجهيز على بيكوستا؟', a: 'يمكنك البدء بإنشاء حساب، ثم إدخال بيانات المتجر أو الفرع الأول، ثم مراجعة الباقة المنشورة الأنسب لحجم التشغيل. وإذا أردت ترتيب المسار قبل البدء فيمكنك التواصل مع الفريق من صفحة التواصل.' },
        { q: 'هل أحتاج أجهزة خاصة للكاشير أو المخزون؟', a: 'يعمل بيكوستا عبر المتصفح على الكمبيوتر أو التابلت أو الهاتف. وحسب طبيعة النشاط يمكن إضافة أدوات مثل طابعة الفواتير أو قارئ الباركود، لكن التجهيز الدقيق يتحدد بحسب طريقة التشغيل عندك.' },
        { q: 'كيف تعمل الباقات والفوترة؟', a: 'الباقات المعروضة في الهوم بيدج هي نفس الباقات المنشورة فعليًا من داخل النظام. كل باقة تظهر بالسعر ودورة الفوترة المجهزة في الإدارة، أما الاحتياجات الأكبر أو الخاصة فيمكن ترتيبها عبر التواصل مع المبيعات.' },
        { q: 'كيف أتواصل مع الفريق إذا احتجت توضيحًا أو تجهيزًا؟', a: 'أفضل مسار هو صفحة التواصل، ومن خلالها يصل الطلب للفريق المناسب بحسب نوع النشاط وحجم التشغيل. يمكن ترتيب المسار وتوضيح خطوات البدء قبل الانتقال للاشتراك أو التفعيل.' },
      ]
    },
    ctaSection: {
      h2: 'جاهز لرفع <span class="text-brand-gold">كفاءة تجارتك</span> اليوم؟',
      h2Alt: 'ابدأ بخطة أوضح لتشغيل متجرك مع بيكوستا',
      sub: 'لا بطاقة ائتمانية · إعداد في 5 دقائق · إلغاء في أي وقت',
      primary: 'ابدأ رحلتك',
      secondary: 'تواصل مع المبيعات',
      features: [
        { icon: 'Zap', text: 'بدء سريع' },
        { icon: 'ShieldCheck', text: 'تسجيل بسيط' },
        { icon: 'Clock', text: 'مسار مرن' }
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
      sub: 'PayQusta brings POS, online selling, and inventory workflows into one clearer operating path.',
      ctaPrimary: 'Get Started →',
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
      { title: 'Clear Plans', desc: 'Choose the plan that fits your business with simpler pricing and a clearer starting path' },
      { title: 'Offline Ready', desc: 'Cloud POS works offline & syncs auto' },
      { title: 'Secure Operations', desc: 'Clear access controls and practical safeguards to help teams operate with confidence' },
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
      sub: 'Illustrative examples of the kinds of indicators merchants may track as operations grow.',
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
      h2: 'Illustrative merchant scenarios',
      items: [
        { name: 'Mohamed Ali', role: 'Fashion Shop Owner', company: 'Illustrative scenario for a fashion store that needs faster checkout and clearer day-to-day sales flow.', initials: 'M.A' },
        { name: 'Ahmed Mahmoud', role: 'Supermarket Manager', company: 'Illustrative scenario for a supermarket that wants simpler stock follow-up and faster stocktake from mobile.', initials: 'A.M' },
        { name: 'Sarah Hassan', role: 'E-commerce Seller', company: 'Illustrative scenario for an online seller who wants clearer order visibility across store and sales channels.', initials: 'S.H' },
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
        { q: 'How do I start setting up on PayQusta?', a: 'You can begin by creating an account, adding your first store or branch details, then reviewing the published plan that matches your current operating size. If you want help mapping the rollout first, you can start from the contact page.' },
        { q: 'Do I need special hardware for POS or inventory?', a: 'PayQusta runs in the browser on desktop, tablet, or mobile. Some businesses may also connect tools like a receipt printer or barcode scanner, but the exact hardware setup depends on how your team operates day to day.' },
        { q: 'How do pricing and billing work?', a: 'The plans shown on the homepage are the same plans currently published from the admin side of the system. Each plan price and billing cycle reflects the live configuration, while larger or custom operating setups can be arranged through the sales team.' },
        { q: 'How do I reach the team for setup or clarification?', a: 'The contact page is the best starting point. From there the request can be routed to the right team based on your business type and operating size, so you can clarify the rollout path before moving into subscription or activation.' },
      ]
    },
    ctaSection: {
      h2: 'Ready to boost your <span class="text-brand-gold">business efficiency</span> today?',
      h2Alt: 'Start with a clearer rollout path for your store',
      sub: 'No credit card · 5 min setup · Cancel anytime',
      primary: 'Start your setup',
      secondary: 'Contact Sales',
      features: [
        { icon: 'Zap', text: 'Quick start' },
        { icon: 'ShieldCheck', text: 'Simple onboarding' },
        { icon: 'Clock', text: 'Flexible rollout' }
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
