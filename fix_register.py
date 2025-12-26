import re

# Read the file
with open('C:/Users/u/hipo/backend/src/controllers/authController.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the register response section
old_pattern = r'''    res\.status\(201\)\.json\(\{
      message: '회원가입 성공',
      user: \{
        id: user\.id,
        email: user\.email,
        username: user\.username,
        poBalance: user\.poBalance
      \}
    \}\);'''

new_text = '''    // JWT 토큰 발급
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: '회원가입 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
        poBalance: user.poBalance,
        marketCap: user.marketCap,
        trustLevel: user.trustLevel,
        trustMultiplier: user.trustMultiplier
      }
    });'''

content = re.sub(old_pattern, new_text, content, flags=re.MULTILINE)

# Write back
with open('C:/Users/u/hipo/backend/src/controllers/authController.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ authController.js updated successfully!")
