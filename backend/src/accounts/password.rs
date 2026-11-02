use anyhow::anyhow;
use argon2::{Argon2, PasswordHasher, PasswordVerifier, password_hash::phc::PasswordHash};

pub async fn hash(password: String) -> anyhow::Result<String> {
    tokio::task::spawn_blocking(move || {
        Argon2::default()
            .hash_password(password.as_bytes())
            .map(|hash| hash.to_string())
            .map_err(|err| anyhow!("hashing password failed: {err}"))
    })
    .await?
}

pub async fn verify(password: String, stored: String) -> anyhow::Result<bool> {
    tokio::task::spawn_blocking(move || {
        let parsed =
            PasswordHash::new(&stored).map_err(|err| anyhow!("stored hash is invalid: {err}"))?;
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok())
    })
    .await?
}
