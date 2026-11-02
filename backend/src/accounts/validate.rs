use crate::error::{AppError, AppResult};

pub fn username(raw: &str) -> AppResult<String> {
    let username = raw.trim().to_lowercase();
    let valid_length = (3..=30).contains(&username.len());
    let valid_chars = username
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_' || c == '.');
    if valid_length && valid_chars {
        Ok(username)
    } else {
        Err(AppError::BadRequest(
            "username needs 3 to 30 letters, digits, dots or underscores".into(),
        ))
    }
}

pub fn display_name(raw: &str) -> AppResult<String> {
    let name = raw.trim();
    if (1..=50).contains(&name.chars().count()) {
        Ok(name.to_string())
    } else {
        Err(AppError::BadRequest(
            "display name needs 1 to 50 characters".into(),
        ))
    }
}

pub fn email(raw: &str) -> AppResult<String> {
    let email = raw.trim();
    match email.split_once('@') {
        Some((local, domain)) if !local.is_empty() && domain.contains('.') => Ok(email.to_string()),
        _ => Err(AppError::BadRequest("email address is not valid".into())),
    }
}

pub fn password(raw: &str) -> AppResult<()> {
    if raw.chars().count() >= 8 {
        Ok(())
    } else {
        Err(AppError::BadRequest(
            "password needs at least 8 characters".into(),
        ))
    }
}

pub fn bio(raw: &str) -> AppResult<String> {
    let bio = raw.trim();
    if bio.chars().count() <= 280 {
        Ok(bio.to_string())
    } else {
        Err(AppError::BadRequest(
            "bio can have at most 280 characters".into(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn username_is_normalized_to_lowercase() {
        assert_eq!(username("  Zahra_99 ").unwrap(), "zahra_99");
    }

    #[test]
    fn username_rejects_spaces_and_short_names() {
        assert!(username("ab").is_err());
        assert!(username("two words").is_err());
    }

    #[test]
    fn email_needs_domain_with_dot() {
        assert!(email("a@b.de").is_ok());
        assert!(email("a@localhost").is_err());
        assert!(email("@b.de").is_err());
    }
}
