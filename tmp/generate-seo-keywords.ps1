$outputPath = Join-Path $PSScriptRoot "..\docs\seo-keywords-ar.csv"

$intents = @(
  "أفضل",
  "أرخص",
  "سعر",
  "تكلفة",
  "شراء",
  "اشتراك",
  "تجربة",
  "مقارنة",
  "بديل",
  "حل",
  "منصة",
  "برنامج",
  "نظام",
  "موقع",
  "خدمة",
  "كيفية",
  "طريقة",
  "عايز",
  "أحتاج",
  "أبحث عن"
)

$primaryIntents = $intents[0..9]

$features = @(
  "منصة تجارة إلكترونية",
  "منصة إنشاء متجر إلكتروني",
  "برنامج إدارة متجر إلكتروني",
  "نظام إدارة المبيعات والمخزون",
  "برنامج الفواتير والمخزون",
  "منصة إدارة الطلبات والعملاء",
  "لوحة تحكم للتجار",
  "بوابة عملاء للمتجر",
  "منصة متعددة التجار",
  "منصة متعددة المتاجر",
  "حل إدارة المتجر والفواتير",
  "برنامج متابعة الطلبات",
  "منصة checkout للمتاجر",
  "برنامج إدارة العملاء والفواتير",
  "نظام الموردين والمخزون",
  "منصة تقارير المبيعات",
  "منصة اشتراكات للتجار",
  "منصة إدارة المتجر أونلاين",
  "برنامج catalog و cart",
  "حل storefront و customer portal"
)

$audiences = @(
  "للمتاجر الصغيرة",
  "للمتاجر الكبيرة",
  "للمتاجر الناشئة",
  "للمتاجر متعددة الفروع",
  "لمتاجر الملابس",
  "لمتاجر الأحذية",
  "لمتاجر الإلكترونيات",
  "لمتاجر الجوالات",
  "لمتاجر العطور",
  "لمتاجر التجميل",
  "للسوبر ماركت",
  "للصيدليات",
  "للمكتبات",
  "لمتاجر الهدايا",
  "لمتاجر الأثاث",
  "لمتاجر الأدوات المنزلية",
  "للمطاعم",
  "للكافيهات",
  "للبيع بالتجزئة",
  "للبيع بالجملة"
)

$regions = @(
  "في مصر",
  "في السعودية",
  "في الإمارات",
  "في الكويت",
  "في قطر",
  "في البحرين",
  "في عمان",
  "في الأردن",
  "في العراق",
  "في ليبيا",
  "في الجزائر",
  "في المغرب",
  "في تونس",
  "في السودان",
  "في الخليج",
  "في الوطن العربي"
)

$qualifiers = @(
  "مع إدارة المخزون",
  "مع الفواتير الإلكترونية",
  "مع إدارة العملاء",
  "مع إدارة الموردين",
  "مع تتبع الطلبات",
  "مع تتبع الشحن",
  "مع checkout سريع",
  "مع cart احترافي",
  "مع دومين مخصص",
  "مع subdomain",
  "مع بوابة عملاء",
  "مع إشعارات واتساب",
  "مع إشعارات البريد الإلكتروني",
  "مع صلاحيات الموظفين",
  "مع تعدد الفروع",
  "مع تقارير مبيعات",
  "مع دعم الطلب كضيف",
  "مع تتبع الطلب بدون تسجيل",
  "مع wishlist",
  "مع إدارة المرتجعات"
)

$problems = @(
  "لإدارة الطلبات من مكان واحد",
  "لإدارة المخزون والفواتير في نفس النظام",
  "لبناء متجر إلكتروني مع لوحة تحكم",
  "لتتبع طلبات العملاء بسهولة",
  "لزيادة مبيعات المتجر أونلاين",
  "لتقليل أخطاء المخزون",
  "لتنظيم الموردين والعملاء",
  "لعمل فواتير وتقارير مبيعات",
  "لإنشاء بورتال للعملاء",
  "لربط المتجر مع واتساب",
  "لتشغيل أكثر من فرع",
  "لإدارة أكثر من متجر",
  "لإطلاق متجر بسرعة",
  "لتحسين تجربة checkout",
  "لتتبع الطلبات للعميل كضيف",
  "لتشغيل SaaS للمتاجر"
)

$brandTerms = @(
  "PayQusta",
  "payqusta",
  "pay qusta",
  "pay qousta",
  "payqousta",
  "pay kousta",
  "paykousta",
  "pai qusta",
  "pai qousta",
  "pai kousta",
  "pay2usta",
  "pay2ousta",
  "باي كوستا",
  "بايكوستا",
  "باي قوستا",
  "بايقوستا",
  "باي كوستا",
  "بايكوستا",
  "بي كوستا",
  "بيكويستا"
)

$brandQueries = @(
  "تسعير",
  "الأسعار",
  "الخطط",
  "المميزات",
  "مراجعات",
  "شرح",
  "تجربة",
  "منصة تجارة إلكترونية عربية",
  "برنامج إدارة متجر",
  "برنامج مخزون وفواتير",
  "بوابة العملاء",
  "checkout",
  "customer portal",
  "storefront",
  "multi tenant ecommerce"
)

$englishMixed = @(
  "best ecommerce saas for arab merchants",
  "arabic ecommerce platform with inventory",
  "multi tenant ecommerce platform arabic",
  "online store management software for middle east",
  "customer portal for ecommerce store arabic",
  "checkout and order tracking software arabic",
  "inventory and invoicing software for stores arabic",
  "storefront with customer portal and backoffice",
  "b2c ecommerce saas with supplier management",
  "retail inventory invoicing and checkout platform",
  "shop management software with invoices arabic",
  "whatsapp notifications for ecommerce platform",
  "guest order tracking ecommerce arabic",
  "ecommerce portal for customers arabic",
  "store inventory reporting software middle east",
  "order management and billing saas arabic",
  "online store with supplier management arabic",
  "multi store ecommerce management software",
  "custom domain ecommerce saas arabic",
  "arabic online store checkout platform"
)

$records = New-Object System.Collections.Generic.List[object]
$seen = New-Object System.Collections.Generic.HashSet[string]
$id = 1

function Add-Query {
  param(
    [string]$Category,
    [string]$Query
  )

  $normalized = ($Query -replace "\s+", " ").Trim()
  if ([string]::IsNullOrWhiteSpace($normalized)) {
    return
  }

  if ($seen.Add($normalized)) {
    $records.Add([pscustomobject]@{
      id = $script:id
      category = $Category
      query = $normalized
    })
    $script:id++
  }
}

function Pick-Intent {
  param([int]$Index)
  return $primaryIntents[$Index % $primaryIntents.Count]
}

foreach ($feature in $features) {
  Add-Query "feature" $feature
}

foreach ($feature in $features) {
  foreach ($intent in $intents) {
    Add-Query "intent-feature" "$intent $feature"
  }
}

foreach ($feature in $features) {
  foreach ($audience in $audiences) {
    Add-Query "feature-audience" "$feature $audience"
  }
}

foreach ($feature in $features) {
  foreach ($region in $regions) {
    Add-Query "feature-region" "$feature $region"
  }
}

foreach ($feature in $features) {
  foreach ($qualifier in $qualifiers) {
    Add-Query "feature-qualifier" "$feature $qualifier"
  }
}

$counter = 0
foreach ($feature in $features) {
  foreach ($audience in $audiences) {
    $intent = Pick-Intent $counter
    Add-Query "intent-feature-audience" "$intent $feature $audience"
    $counter++
  }
}

$counter = 0
foreach ($feature in $features) {
  foreach ($region in $regions) {
    $intent = Pick-Intent ($counter + 3)
    Add-Query "intent-feature-region" "$intent $feature $region"
    $counter++
  }
}

$counter = 0
foreach ($feature in $features) {
  foreach ($qualifier in $qualifiers) {
    $intent = Pick-Intent ($counter + 5)
    Add-Query "intent-feature-qualifier" "$intent $feature $qualifier"
    $counter++
  }
}

$featureSlice = $features[0..9]
$qualifierSlice = $qualifiers[0..7]
$audienceSlice = $audiences[0..9]
$regionSlice = $regions[0..7]

foreach ($feature in $featureSlice) {
  foreach ($qualifier in $qualifierSlice) {
    foreach ($audience in $audienceSlice) {
      Add-Query "feature-qualifier-audience" "$feature $qualifier $audience"
    }
  }
}

foreach ($feature in $featureSlice) {
  foreach ($qualifier in $qualifierSlice) {
    foreach ($region in $regionSlice) {
      Add-Query "feature-qualifier-region" "$feature $qualifier $region"
    }
  }
}

foreach ($feature in $features) {
  foreach ($problem in $problems) {
    Add-Query "problem-solution" "$feature $problem"
  }
}

foreach ($brand in $brandTerms) {
  Add-Query "brand" $brand
  foreach ($suffix in $brandQueries) {
    Add-Query "brand-query" "$brand $suffix"
    Add-Query "brand-query" "$suffix $brand"
  }
}

foreach ($query in $englishMixed) {
  Add-Query "mixed-language" $query
}

$records | Export-Csv -Path $outputPath -NoTypeInformation -Encoding UTF8
Write-Output ("Generated {0} unique queries into {1}" -f $records.Count, (Resolve-Path $outputPath))
