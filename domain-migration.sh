#!/bin/bash

# Claude Code Guide Domain Migration Script
# From: claude-code-guide-sooty.vercel.app
# To: getclaudecode.com

echo "🚀 Claude Code Guide Domain Migration Script"
echo "============================================"
echo "This script will replace all instances of the old domain with the new domain."
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Domains
OLD_DOMAIN="claude-code-guide-sooty.vercel.app"
NEW_DOMAIN="getclaudecode.com"

# Backup check
echo -e "${YELLOW}⚠️  Please ensure you have a backup before proceeding!${NC}"
read -p "Have you created a backup? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Please create a backup first!"
    exit 1
fi

# Show what will be changed
echo -e "\n${BLUE}📋 Files to be updated:${NC}"
echo "- HTML files (index.html, guide.html, about.html, faq.html)"
echo "- JavaScript files (main.js, guide-manager.js, analytics.js)"
echo "- SEO files (sitemap.xml, robots.txt)"
echo "- README.md"

# Confirmation
echo -e "\n${YELLOW}This will replace:${NC}"
echo "  $OLD_DOMAIN"
echo -e "${YELLOW}With:${NC}"
echo "  $NEW_DOMAIN"
echo ""
read -p "Do you want to proceed? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Operation cancelled."
    exit 1
fi

# Function to replace in file
replace_in_file() {
    local file=$1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/$OLD_DOMAIN/$NEW_DOMAIN/g" "$file"
    else
        # Linux
        sed -i "s/$OLD_DOMAIN/$NEW_DOMAIN/g" "$file"
    fi
}

# Start replacement
echo -e "\n${GREEN}🔄 Starting domain replacement...${NC}\n"

# HTML files
echo "📄 Updating HTML files..."
replace_in_file "src/index.html"
replace_in_file "src/guide.html"
replace_in_file "src/about.html"
replace_in_file "src/faq.html"

# JavaScript files
echo "📝 Updating JavaScript files..."
replace_in_file "src/js/main.js"
replace_in_file "src/js/modules/guide-manager.js"
replace_in_file "src/js/modules/analytics.js"

# SEO files
echo "🌐 Updating SEO files..."
replace_in_file "public/sitemap.xml"
replace_in_file "public/robots.txt"

# README
echo "📚 Updating README..."
replace_in_file "README.md"

# Verify changes
echo -e "\n${GREEN}✅ Domain replacement complete!${NC}"
echo -e "\n${BLUE}📊 Verification:${NC}"
echo "Checking for remaining old domain references..."
remaining=$(grep -r "$OLD_DOMAIN" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude="*.md" --exclude="domain-migration.sh" | wc -l)

if [ $remaining -eq 0 ]; then
    echo -e "${GREEN}✅ All domain references have been updated successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Found $remaining remaining references to old domain${NC}"
    grep -r "$OLD_DOMAIN" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude="*.md" --exclude="domain-migration.sh"
fi

echo -e "\n${BLUE}🎯 Next steps:${NC}"
echo "1. Review the changes: git diff"
echo "2. Build and test locally: npm run build && npm run preview"
echo "3. Commit changes: git add -A && git commit -m 'feat: Update domain to getclaudecode.com'"
echo "4. Push to preview branch: git push origin feature/custom-domain-getclaudecode"
echo ""
echo -e "${GREEN}✨ Script completed!${NC}"